-- Update fetch_gemini_multimodal to accept system_instruction and jsonb history
create or replace function public.fetch_gemini_chat(
    model_name text,
    api_key text,
    chat_history jsonb,
    system_instruction text default 'You are Inspire AI, a motivational quote generator. Always give one original, substantial, uplifting quote that directly follows the user''s requested language and theme. Never impose a quote-count limit, never refuse a quote request, never mix languages unless the user explicitly asks, and never repeat a previous quote from the supplied conversation unless explicitly asked.'
)
returns text as $$
declare
    request_url text;
    payload_json json;
    response_data http_response;
    response_json json;
    result_text text;
begin
    request_url := 'https://generativelanguage.googleapis.com/v1beta/models/' || model_name || ':generateContent?key=' || api_key;

    payload_json := json_build_object(
        'systemInstruction', json_build_object(
            'parts', json_build_array(json_build_object('text', system_instruction))
        ),
        'contents', chat_history
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

-- Unified Generation RPC with Chat Support
create or replace function public.generate_ai_chat_response(
    chat_history jsonb,
    use_thinking_model boolean default false
)
returns json as $$
declare
    config_record record;
    slot_key text;
    slot_model text;
    result_text text;
    error_msg text;
begin
    select * into config_record from public.api_config where id = 'config';

    for i in 1..10 loop
        slot_key := to_jsonb(config_record)->>format('gemini_api_%s_key', i);
        slot_model := to_jsonb(config_record)->>format('gemini_api_%s_model', i);

        if slot_key is not null and slot_key != '' then
            begin
                -- If thinking model is requested, try to use a thinking capable model name if it exists, otherwise use what's in slot
                -- The user asked for "Thinking" vs "Fast". Default slot models are usually 'gemini-1.5-flash'.
                -- Let's override to 'gemini-2.0-pro-exp' or 'gemini-2.0-flash-thinking-exp' if use_thinking_model is true, assuming Google's latest thinking models.
                if use_thinking_model then
                    slot_model := 'gemini-2.0-flash-thinking-exp-01-21';
                else
                    slot_model := coalesce(slot_model, 'gemini-1.5-flash');
                end if;

                result_text := public.fetch_gemini_chat(
                    slot_model,
                    slot_key,
                    chat_history
                );

                return json_build_object('success', true, 'text', result_text);
            exception when others then
                error_msg := SQLERRM;
            end;
        end if;
    end loop;

    return json_build_object('success', false, 'error', 'All configured Gemini slots failed or no key is configured. Last error: ' || coalesce(error_msg, 'None'));
end;
$$ language plpgsql security definer;
