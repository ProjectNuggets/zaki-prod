const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_CANDIDATE_PATTERN =
  /(?:\+?\d[\d\s().-]{6,}\d|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b\d{2,4}[-.\s]\d{2,4}[-.\s]\d{3,4}\b)/;
const OTP_PATTERN = /\b(?:otp|passcode|verification code|one[- ]time code|رمز(?:\s+)?التحقق|كود(?:\s+)?التحقق)\b/i;
const SECRET_PATTERN =
  /\b(?:password|passcode|secret|private key|seed phrase|recovery phrase|api key|token|webhook secret|client secret|password reset)\b|(?:كلمة(?:\s+)?المرور|سر(?:ي|ية)?|مفتاح(?:\s+)?خاص|عبارة(?:\s+)?الاسترداد|رمز(?:\s+)?سري)/i;
const ADDRESS_PATTERN =
  /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl|square|sq)\b|(?:شارع|طريق|جادة|عمارة|شقة|منزل|حي)\s+[\p{L}\p{N}\s-]{2,}/iu;
const NATIONAL_ID_PATTERN =
  /\b(?:passport|national id|social security|ssn|id number|هوية|جواز(?:\s+)?سفر|رقم(?:\s+)?هوية)\b/i;
const FINANCIAL_NUMBER_PATTERN =
  /\b(?:credit card|card number|iban|bank account|account number|routing number|رقم(?:\s+)?الحساب|بطاقة(?:\s+)?ائتمان|iban)\b/i;

const LEXICAL_CATEGORIES = [
  {
    category: "sensitive_health",
    reason: "sensitive_health",
    patterns: [
      /\b(?:health|medical|diagnos(?:is|ed)|therapy|therapist|depression|anxiety|panic|trauma|medication|prescription|clinic|hospital|doctor|illness|chronic)\b/i,
      /(?:صحة|طبي|تشخيص|تشخيصي|علاج|معالج|اكتئاب|قلق|هلع|صدمة|دواء|وصفة|مستشفى|دكتور|مرض|مزمن)/i,
    ],
  },
  {
    category: "sensitive_finance",
    reason: "sensitive_finance",
    patterns: [
      /\b(?:income|salary|debt|loan|mortgage|rent overdue|bank account|credit card|banking|savings|bank transfer)\b/i,
      /(?:راتب|دخل|دين|قرض|رهن|إيجار|ايجار|حساب(?:\s+)?بنكي|تحويل(?:\s+)?بنكي|مدخرات)/i,
    ],
  },
  {
    category: "sensitive_legal",
    reason: "sensitive_legal",
    patterns: [
      /\b(?:lawsuit|arrest|court|legal case|visa problem|immigration status|police|custody)\b/i,
      /(?:دعوى|محكمة|قضية|اعتقال|شرطة|تأشيرة|تاشيرة|هجرة|حضانة)/i,
    ],
  },
  {
    category: "sensitive_religion_politics",
    reason: "sensitive_religion_politics",
    patterns: [
      /\b(?:religion|religious|politics|political|party affiliation|vote for)\b/i,
      /(?:دين|ديني|سياسة|سياسي|حزب|أصوّت|اصوت)/i,
    ],
  },
  {
    category: "sensitive_relationship",
    reason: "sensitive_relationship",
    patterns: [
      /\b(?:sexual|pregnan|boyfriend|girlfriend|husband|wife|partner|dating|relationship status|divorce)\b/i,
      /(?:حامل|حمل|صديق(?:ة)?|زوج|زوجة|شريك|علاقة|طلاق)/i,
    ],
  },
  {
    category: "sensitive_contact",
    reason: "sensitive_contact",
    patterns: [
      /\b(?:phone number|email address|home address|contact me at|reach me at)\b/i,
      /(?:رقم(?:\s+)?الهاتف|بريد(?:\s+)?إلكتروني|بريد(?:\s+)?الكتروني|عنوان(?:\s+)?المنزل|تواصل(?:\s+)?معي)/i,
    ],
  },
];

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function countDigits(value) {
  return String(value || "").replace(/\D/g, "").length;
}

function looksLikePhoneNumber(value) {
  const text = normalizeText(value);
  if (!PHONE_CANDIDATE_PATTERN.test(text)) return false;
  const digits = countDigits(text);
  return digits >= 7 && digits <= 15;
}

function matchStructuredPattern(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (EMAIL_PATTERN.test(normalized)) {
    return { sensitive: true, category: "sensitive_contact", reason: "pii_email" };
  }
  if (looksLikePhoneNumber(normalized)) {
    return { sensitive: true, category: "sensitive_contact", reason: "pii_phone" };
  }
  if (OTP_PATTERN.test(normalized)) {
    return { sensitive: true, category: "sensitive_credentials", reason: "secret_otp" };
  }
  if (SECRET_PATTERN.test(normalized)) {
    return { sensitive: true, category: "sensitive_credentials", reason: "secret_credentials" };
  }
  if (ADDRESS_PATTERN.test(normalized)) {
    return { sensitive: true, category: "sensitive_contact", reason: "pii_address" };
  }
  if (NATIONAL_ID_PATTERN.test(normalized)) {
    return { sensitive: true, category: "sensitive_identity", reason: "pii_national_id" };
  }
  if (FINANCIAL_NUMBER_PATTERN.test(normalized)) {
    return { sensitive: true, category: "sensitive_finance", reason: "financial_identifier" };
  }
  return null;
}

function matchLexicalCategory(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  for (const category of LEXICAL_CATEGORIES) {
    if (category.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        sensitive: true,
        category: category.category,
        reason: category.reason,
      };
    }
  }
  return null;
}

function matchHeuristicCategory(fact) {
  const type = String(fact?.type || "").trim().toLowerCase();
  const content = normalizeText(fact?.content);
  const conflictKey = String(fact?.conflictKey || "").trim().toLowerCase();

  if (!content) return null;

  if (type === "relationship" && /(?:partner|زوج|زوجة|boyfriend|girlfriend|dating|relationship|علاقة)/i.test(content)) {
    return {
      sensitive: true,
      category: "sensitive_relationship",
      reason: "relationship_private",
    };
  }

  if (
    (conflictKey === "identity:name" || /(?:name is|اسمي)/i.test(content)) &&
    (EMAIL_PATTERN.test(content) || looksLikePhoneNumber(content))
  ) {
    return {
      sensitive: true,
      category: "sensitive_identity",
      reason: "identity_with_contact_identifier",
    };
  }

  return null;
}

export function classifySensitiveMemoryCandidate(fact) {
  const content = normalizeText(fact?.content);
  if (!content) {
    return { sensitive: false };
  }

  return (
    matchStructuredPattern(content) ||
    matchLexicalCategory(content) ||
    matchHeuristicCategory(fact) || {
      sensitive: false,
    }
  );
}
