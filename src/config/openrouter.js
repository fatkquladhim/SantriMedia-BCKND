/**
 * OpenRouter AI Client
 * Referensi Context7: /websites/openrouter_ai — fetch-based chat completions
 */
import { env } from './environment.js';
import { logger } from '../shared/logger.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Send a chat completion request to OpenRouter.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @param {string} [options.model] — Override default model
 * @param {number} [options.temperature] — 0-2
 * @param {number} [options.max_tokens]
 * @returns {Promise<string>} — The assistant's reply content
 */
export async function chatCompletion(messages, options = {}) {
    const model = options.model || env.openRouter.model;

    try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.openRouter.apiKey}`,
                'HTTP-Referer': env.openRouter.appUrl,
                'X-Title': env.openRouter.appName,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1024,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `OpenRouter API error ${response.status}: ${errorData?.error?.message || response.statusText}`
            );
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        logger.error({ err: error, model }, 'OpenRouter chat completion failed');
        throw error;
    }
}

/**
 * Send a structured JSON request (forces JSON output).
 */
export async function chatCompletionJSON(messages, options = {}) {
    const raw = await chatCompletion(messages, options);

    // Try to parse JSON from the response
    try {
        const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
        return JSON.parse(jsonStr.trim());
    } catch {
        logger.warn({ raw }, 'Failed to parse AI response as JSON, returning raw');
        return { raw };
    }
}
