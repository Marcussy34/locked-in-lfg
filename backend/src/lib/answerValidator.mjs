import { appConfig } from '../config.mjs';

function getResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.length > 0) {
    return payload.output_text;
  }

  if (!Array.isArray(payload?.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') {
        return content.text;
      }
    }
  }

  return null;
}

export function hasHybridValidatorConfig() {
  return Boolean(
    appConfig.answerValidatorHybridEnabled &&
      appConfig.openaiApiKey &&
      appConfig.openaiValidatorModel,
  );
}

export async function enhanceValidatorFeedback({
  prompt,
  learnerAnswer,
  criteriaBreakdown,
  integrityFlags,
  accepted,
  rubricMode,
}) {
  if (!hasHybridValidatorConfig()) {
    return null;
  }

  // Hybrid mode never decides acceptance. It only upgrades the explanation text.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.openaiValidatorTimeoutMs);

  try {
    const response = await fetch(`${appConfig.openaiResponsesBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appConfig.openaiApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: appConfig.openaiValidatorModel,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'You improve lesson-answer feedback. Do not change acceptance. Return concise educational feedback as JSON.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({
                  prompt,
                  learnerAnswer,
                  accepted,
                  rubricMode,
                  criteriaBreakdown,
                  integrityFlags,
                }),
              },
            ],
          },
        ],
        max_output_tokens: 160,
        text: {
          format: {
            type: 'json_schema',
            name: 'validator_feedback',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['feedbackSummary'],
              properties: {
                feedbackSummary: {
                  type: 'string',
                  description:
                    'One short paragraph covering what was correct, what was missing, and how to improve.',
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI validator request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const outputText = getResponseText(payload);
    if (!outputText) {
      return null;
    }

    const parsed = JSON.parse(outputText);
    if (typeof parsed?.feedbackSummary !== 'string' || parsed.feedbackSummary.trim().length === 0) {
      return null;
    }

    return {
      feedbackSummary: parsed.feedbackSummary.trim(),
      validatorMode: 'hybrid_v1',
      validatorVersion: `hybrid-v1:${appConfig.openaiValidatorModel}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
