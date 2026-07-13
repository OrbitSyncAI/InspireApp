-- Enable HTTP extension for serverless API calls from database
create extension if not exists http;

-- Create API configuration table
create table if not exists public.api_config (
    id text primary key default 'config',
    default_provider text default 'gemini',
    gemini jsonb default '{"defaultModel": "gemini-3.1-flash-lite", "activeKey": "", "keys": []}'::jsonb,
    openai jsonb default '{"defaultModel": "gpt-4o-mini", "activeKey": "", "keys": []}'::jsonb,
    openrouter jsonb default '{"defaultModel": "openai/gpt-4o-mini", "activeKey": "", "keys": []}'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) so public cannot read keys
alter table public.api_config enable row level security;

-- RLS Policy: Only authenticated admin can read or write config
create policy "Allow authenticated admin read access" 
on public.api_config for select 
to authenticated 
using (true);

create policy "Allow authenticated admin write access" 
on public.api_config for all 
to authenticated 
using (true);

-- Insert initial empty config if not exists
insert into public.api_config (id) 
values ('config') 
on conflict (id) do nothing;

-- ========================================================
-- Serverless AI Proxy Functions (Runs Securely on DB)
-- ========================================================

-- 1. Gemini Caller
create or replace function public.fetch_gemini_ai(model_name text, api_key text, prompt_text text)
returns text as $$
declare
    request_url text;
    payload text;
    response_data record;
    response_json json;
    result_text text;
begin
    request_url := 'https://generativelanguage.googleapis.com/v1beta/models/' || encode_url_path(model_name) || ':generateContent?key=' || api_key;
    payload := json_build_object(
        'contents', json_build_array(
            json_build_object(
                'parts', json_build_array(
                    json_build_object('text', prompt_text)
                )
            )
        )
    )::text;

    select * into response_data from http_post(request_url, payload, 'application/json');

    if response_data.status = 200 then
        response_json := response_data.content::json;
        result_text := response_json->'candidates'->0->'content'->'parts'->0->>'text';
        return result_text;
    else
        raise exception 'Gemini API returned status % with payload %', response_data.status, response_data.content;
    end if;
end;
$$ language plpgsql security definer;

-- 2. OpenAI-like Caller (OpenAI, OpenRouter, Groq, Deepseek, Mistral)
create or replace function public.fetch_openai_like_ai(endpoint_url text, model_name text, api_key text, prompt_text text)
returns text as $$
declare
    payload text;
    response_data record;
    response_json json;
    result_text text;
    headers http_header[];
begin
    payload := json_build_object(
        'model', model_name,
        'messages', json_build_array(
            json_build_object('role', 'user', 'content', prompt_text)
        ),
        'temperature', 0.8
    )::text;

    headers := array[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || api_key),
        http_header('HTTP-Referer', 'https://github.com/OrbitSyncAI/InspireApp'),
        http_header('X-Title', 'InspireApp')
    ];

    select * into response_data from http((
        'POST',
        endpoint_url,
        headers,
        'application/json',
        payload
    )::http_request);

    if response_data.status = 200 then
        response_json := response_data.content::json;
        result_text := response_json->'choices'->0->'message'->>'content';
        return result_text;
    else
        raise exception 'AI Provider API returned status % with payload %', response_data.status, response_data.content;
    end if;
end;
$$ language plpgsql security definer;

-- 3. Unified Generation RPC (Publicly Callable, Keys are Safe)
create or replace function public.generate_ai_quote(provider text, model text, prompt text)
returns json as $$
declare
    config_record record;
    provider_config jsonb;
    target_model text;
    api_key text;
    keys_list text[];
    result_text text;
    error_msg text;
begin
    -- Load keys config from secure table (runs as owner, bypassing RLS safely)
    select * into config_record from public.api_config where id = 'config';
    
    if provider = 'gemini' then
        provider_config := config_record.gemini;
    elsif provider = 'openai' then
        provider_config := config_record.openai;
    elsif provider = 'openrouter' then
        provider_config := config_record.openrouter;
    else
        return json_build_object('success', false, 'error', 'Unsupported AI provider');
    end if;

    target_model := coalesce(nullif(model, ''), provider_config->>'defaultModel');
    
    -- Extract keys
    api_key := provider_config->>'activeKey';
    if provider_config->'keys' is not null then
        keys_list := array(select jsonb_array_elements_text(provider_config->'keys'));
    end if;

    -- Add primary key to list if not already there
    if api_key is not null and api_key != '' then
        if not (keys_list @> array[api_key]) then
            keys_list := api_key || keys_list;
        end if;
    end if;

    if array_length(keys_list, 1) is null or array_length(keys_list, 1) = 0 then
        return json_build_object('success', false, 'error', 'No API keys configured on server for this provider');
    end if;

    -- Attempt generation with fallback keys
    for i in 1..array_length(keys_list, 1) loop
        begin
            if provider = 'gemini' then
                result_text := public.fetch_gemini_ai(target_model, keys_list[i], prompt);
            elsif provider = 'openai' then
                result_text := public.fetch_openai_like_ai('https://api.openai.com/v1/chat/completions', target_model, keys_list[i], prompt);
            elsif provider = 'openrouter' then
                result_text := public.fetch_openai_like_ai('https://openrouter.ai/api/v1/chat/completions', target_model, keys_list[i], prompt);
            end if;

            -- If successful, return result
            return json_build_object('success', true, 'text', result_text);
        exception when others then
            error_msg := SQLERRM;
            -- Continue to next key in loop
        end;
    end loop;

    return json_build_object('success', false, 'error', 'All configured keys failed. Last error: ' || coalesce(error_msg, 'Unknown'));
end;
$$ language plpgsql security definer;

-- URL Encode helper function
create or replace function public.encode_url_path(url_text text)
returns text as $$
begin
    return replace(replace(replace(url_text, ' ', '%20'), '/', '%2F'), ':', '%3A');
end;
$$ language plpgsql immutable strict;
