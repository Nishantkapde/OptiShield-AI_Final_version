interface RedactedEntity {
  type: string;
  original: string;
  placeholder: string;
}

export class PrivacyGuardrailService {
  private static PATTERNS = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    AWS_KEY: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    JWT_TOKEN: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g
  };

  public static maskTelemetry(rawText: string): { maskedText: string; redactedEntities: RedactedEntity[] } {
    let maskedText = rawText;
    const redactedEntities: RedactedEntity[] = [];
    let matchCount: Record<string, number> = {};

    for (const [entityType, pattern] of Object.entries(this.PATTERNS)) {
      matchCount[entityType] = 0;
      maskedText = maskedText.replace(pattern, (match) => {
        matchCount[entityType]++;
        const placeholder = `<${entityType}_${matchCount[entityType]}>`;

        redactedEntities.push({
          type: entityType,
          original: match,
          placeholder: placeholder
        });

        return placeholder;
      });
    }

    return { maskedText, redactedEntities };
  }
}