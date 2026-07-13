-- Enable HTTP extension for serverless API calls from database
create extension if not exists http;

-- ========================================================
-- API Keys Configuration Table (Exclusively Gemini, 5 Slots)
-- ========================================================
create table if not exists public.api_config (
    id text primary key default 'config',
    gemini_api_1_key text default '',
    gemini_api_1_model text default 'gemini-1.5-flash',
    gemini_api_2_key text default '',
    gemini_api_2_model text default 'gemini-1.5-flash',
    gemini_api_3_key text default '',
    gemini_api_3_model text default 'gemini-1.5-flash',
    gemini_api_4_key text default '',
    gemini_api_4_model text default 'gemini-1.5-flash',
    gemini_api_5_key text default '',
    gemini_api_5_model text default 'gemini-1.5-flash',
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

-- Enable Row Level Security (RLS)
alter table public.api_config enable row level security;
alter table public.admin_profile enable row level security;

-- Setup RLS Policies: Authenticated Admin access only
drop policy if exists "Allow auth read config" on public.api_config;
create policy "Allow auth read config" on public.api_config for select to authenticated using (true);

drop policy if exists "Allow auth write config" on public.api_config;
create policy "Allow auth write config" on public.api_config for all to authenticated using (true);

drop policy if exists "Allow auth read profile" on public.admin_profile;
create policy "Allow auth read profile" on public.admin_profile for select to authenticated using (true);

drop policy if exists "Allow auth write profile" on public.admin_profile;
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
            'password_hash', profile_record.password_hash
        );
    else
        return json_build_object('success', false);
    end if;
end;
$$ language plpgsql security definer;

-- 2. Gemini Caller Supporting Text & Multimedia File Attachments
create or replace function public.fetch_gemini_multimodal(
    model_name text, 
    api_key text, 
    prompt_text text,
    file_mime text,
    file_base64 text
)
returns text as $$
declare
    request_url text;
    payload_json jsonb;
    parts_array jsonb[];
    response_data record;
    response_json json;
    result_text text;
begin
    request_url := 'https://generativelanguage.googleapis.com/v1beta/models/' || encode_url_path(model_name) || ':generateContent?key=' || api_key;
    
    parts_array := array[]::jsonb[];

    -- If base64 file is attached, inject inlineData part
    if file_base64 is not null and file_base64 != '' and file_mime is not null and file_mime != '' then
        parts_array := array_append(parts_array, json_build_object(
            'inlineData', json_build_object(
                'mimeType', file_mime,
                'data', file_base64
            )
        )::jsonb);
    end if;

    -- Inject prompt part
    parts_array := array_append(parts_array, json_build_object(
        'text', coalesce(prompt_text, '')
    )::jsonb);

    payload_json := json_build_object(
        'contents', json_build_array(
            json_build_object(
                'parts', parts_array
            )
        )
    );

    select * into response_data from http_post(request_url, payload_json::text, 'application/json');

    if response_data.status = 200 then
        response_json := response_data.content::json;
        result_text := response_json->'candidates'->0->'content'->'parts'->0->>'text';
        return result_text;
    else
        raise exception 'Gemini API returned status % with payload %', response_data.status, response_data.content;
    end if;
end;
$$ language plpgsql security definer;

-- 3. Unified Generation RPC: Loops 5 Gemini Slots (Publicly Callable, Keys are Safe)
create or replace function public.generate_ai_response(
    prompt text,
    mime_type text default '',
    base64_data text default ''
)
returns json as $$
declare
    config_record record;
    slot_key text;
    slot_model text;
    final_prompt text;
    result_text text;
    error_msg text;
begin
    -- Load keys config from secure table
    select * into config_record from public.api_config where id = 'config';
    
    final_prompt := prompt;
    if final_prompt is null or final_prompt = '' then
        final_prompt := 'Generate 5 high quality inspirational, motivational, or life quotes in English. Format each quote on a new line with its author. Output only the quotes, no other conversational intro/outro text.';
    end if;

    -- Loop 5 Slots sequentially
    for i in 1..5 loop
        -- Dynamic slot extraction
        if i = 1 then
            slot_key := config_record.gemini_api_1_key;
            slot_model := config_record.gemini_api_1_model;
        elsif i = 2 then
            slot_key := config_record.gemini_api_2_key;
            slot_model := config_record.gemini_api_2_model;
        elsif i = 3 then
            slot_key := config_record.gemini_api_3_key;
            slot_model := config_record.gemini_api_3_model;
        elsif i = 4 then
            slot_key := config_record.gemini_api_4_key;
            slot_model := config_record.gemini_api_4_model;
        elsif i = 5 then
            slot_key := config_record.gemini_api_5_key;
            slot_model := config_record.gemini_api_5_model;
        end if;

        -- Attempt to call if key is present
        if slot_key is not null and slot_key != '' then
            begin
                result_text := public.fetch_gemini_multimodal(
                    coalesce(slot_model, 'gemini-1.5-flash'),
                    slot_key,
                    final_prompt,
                    mime_type,
                    base64_data
                );

                -- Success, return immediately
                return json_build_object('success', true, 'text', result_text);
            exception when others then
                error_msg := SQLERRM;
                -- Continue loop to next slot fallback
            end;
        end if;
    end loop;

    return json_build_object('success', false, 'error', 'All configured Gemini slots failed or no key is configured. Last error: ' || coalesce(error_msg, 'None'));
end;
$$ language plpgsql security definer;

-- URL Encode helper function
create or replace function public.encode_url_path(url_text text)
returns text as $$
begin
    return replace(replace(replace(url_text, ' ', '%20'), '/', '%2F'), ':', '%3A');
end;
$$ language plpgsql immutable strict;
