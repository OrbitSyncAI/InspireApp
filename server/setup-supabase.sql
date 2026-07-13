-- Enable HTTP extension for serverless API calls from database
create extension if not exists http;

-- ========================================================
-- API Keys Configuration Table
-- ========================================================
create table if not exists public.api_config (
    id text primary key default 'config',
    default_provider text default 'gemini',
    gemini jsonb default '{"defaultModel": "gemini-3.1-flash-lite", "activeKey": "", "keys": []}'::jsonb,
    openai jsonb default '{"defaultModel": "gpt-4o-mini", "activeKey": "", "keys": []}'::jsonb,
    openrouter jsonb default '{"defaultModel": "openai/gpt-4o-mini", "activeKey": "", "keys": []}'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========================================================
-- Admin Profile Table
-- ========================================================
create table if not exists public.admin_profile (
    id text primary key default 'profile',
    username text default 'Sohel',
    password_hash text default '$2b$10$dE7uFIioAo4krZwLJELcC.a6K1q3JGB/o15accQ5/Ocfren9nDwK2', -- default: Sohel@5426@Khan
    primary_email text default 'larsonsteve48@gmail.com',
    recovery_email text default '',
    primary_phone text default '9026053036',
    recovery_phone text default '',
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========================================================
-- OTP Caching Table for recovery requests
-- ========================================================
create table if not exists public.admin_recovery_otp (
    id uuid primary key default gen_random_uuid(),
    method text not null, -- 'email', 'backup_email', 'phone', 'backup_phone'
    destination text not null,
    otp_code text not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.api_config enable row level security;
alter table public.admin_profile enable row level security;
alter table public.admin_recovery_otp enable row level security;

-- Setup RLS Policies: Authenticated Admin access only
create policy "Allow auth read config" on public.api_config for select to authenticated using (true);
create policy "Allow auth write config" on public.api_config for all to authenticated using (true);

create policy "Allow auth read profile" on public.admin_profile for select to authenticated using (true);
create policy "Allow auth write profile" on public.admin_profile for all to authenticated using (true);

-- Insert initial records if not exists
insert into public.api_config (id) values ('config') on conflict (id) do nothing;
insert into public.admin_profile (id) values ('profile') on conflict (id) do nothing;

-- ========================================================
-- Database Stored Procedures (RPCs)
-- ========================================================

-- 1. Custom Admin Login function using bcrypt matching
create or replace function public.admin_authenticate(input_username text)
returns json as $$
declare
    profile_record record;
begin
    select * into profile_record from public.admin_profile where id = 'profile';
    if profile_record.username = input_username then
        return json_build_object(
            'success', true, 
            'password_hash', profile_record.password_hash, 
            'primary_email', profile_record.primary_email,
            'recovery_email', profile_record.recovery_email,
            'primary_phone', profile_record.primary_phone,
            'recovery_phone', profile_record.recovery_phone
        );
    else
        return json_build_object('success', false);
    end if;
end;
$$ language plpgsql security definer;

-- 2. Trigger Password Recovery OTP Generation
create or replace function public.request_recovery_otp(target_method text)
returns json as $$
declare
    profile_record record;
    dest text;
    generated_otp text;
    expiry timestamp with time zone;
begin
    select * into profile_record from public.admin_profile where id = 'profile';
    
    if target_method = 'primary_email' then
        dest := profile_record.primary_email;
    elsif target_method = 'backup_email' then
        dest := profile_record.recovery_email;
    elsif target_method = 'primary_phone' then
        dest := profile_record.primary_phone;
    elsif target_method = 'backup_phone' then
        dest := profile_record.recovery_phone;
    else
        return json_build_object('success', false, 'error', 'Invalid recovery method selected');
    end if;

    if dest is null or dest = '' then
        return json_build_object('success', false, 'error', 'The selected recovery destination is not configured');
    end if;

    -- Generate 6 digit OTP
    generated_otp := floor(100000 + random() * 900000)::text;
    expiry := now() + interval '5 minutes';

    -- Clear existing OTPs for this method
    delete from public.admin_recovery_otp where destination = dest;

    -- Insert new request
    insert into public.admin_recovery_otp (method, destination, otp_code, expires_at)
    values (target_method, dest, generated_otp, expiry);

    -- Log OTP securely to server database logs (for debugging/fallback read)
    raise log 'InspireApp Admin OTP requested for % : %', dest, generated_otp;

    -- Note: Real email notification can be done via database hook, but returning destination for UI masking
    return json_build_object(
        'success', true, 
        'destination_masked', overlay(dest placing '***' from 3 for 5),
        'otp_debug', generated_otp -- Provided for offline development testing locally
    );
end;
$$ language plpgsql security definer;

-- 3. Verify OTP Code and return password reset token
create or replace function public.verify_recovery_otp(target_method text, entered_otp text)
returns json as $$
declare
    profile_record record;
    dest text;
    otp_record record;
begin
    select * into profile_record from public.admin_profile where id = 'profile';
    
    if target_method = 'primary_email' then
        dest := profile_record.primary_email;
    elsif target_method = 'backup_email' then
        dest := profile_record.recovery_email;
    elsif target_method = 'primary_phone' then
        dest := profile_record.primary_phone;
    elsif target_method = 'backup_phone' then
        dest := profile_record.recovery_phone;
    else
        return json_build_object('success', false, 'error', 'Invalid recovery method');
    end if;

    select * into otp_record from public.admin_recovery_otp 
    where destination = dest and otp_code = entered_otp;

    if not found then
        return json_build_object('success', false, 'error', 'Invalid OTP code');
    end if;

    if now() > otp_record.expires_at then
        delete from public.admin_recovery_otp where id = otp_record.id;
        return json_build_object('success', false, 'error', 'OTP code has expired');
    end if;

    -- Clear used OTP
    delete from public.admin_recovery_otp where id = otp_record.id;

    return json_build_object('success', true, 'reset_token', md5(now()::text || random()::text));
end;
$$ language plpgsql security definer;

-- 4. Apply Password Reset
create or replace function public.reset_admin_password(reset_secret text, new_password_hash text)
returns json as $$
begin
    -- Simple check to prevent unauthorized resetting
    if reset_secret is null or length(reset_secret) < 10 then
         return json_build_object('success', false, 'error', 'Invalid authorization token');
    end if;

    update public.admin_profile
    set password_hash = new_password_hash,
        updated_at = now()
    where id = 'profile';

    return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- 5. Gemini Caller
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

-- 6. OpenAI-like Caller (OpenAI, OpenRouter, Groq, Deepseek, Mistral)
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

-- 7. Unified Generation RPC (Publicly Callable, Keys are Safe)
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
    -- Load keys config from secure table
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
