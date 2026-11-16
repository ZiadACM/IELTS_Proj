// Interface text. Arabic needs a fluent reader's check before the pilot (CODING_STANDARDS 3.5).
// Placeholder product name (spec: "Masar" until the owner picks the final name).
import type { InterfaceLanguage } from './api.ts';

const en = {
  appName: 'Masar',
  switchLabel: 'العربية',
  loading: 'Loading…',
  loadFailed: 'Could not load the app. Check your connection and try again.',
  retry: 'Try again',

  welcomeTitle: 'Welcome',
  welcomeIntro: 'Enter your invite code to start practising. You do not need a name or an email address.',
  sessionEnded: 'Your guest session has ended. Enter a new invite code to start again.',
  inviteCodeLabel: 'Invite code',
  inviteCodeHint: 'Ten letters and numbers, for example ABCDE-12345.',
  adultConfirm: 'I confirm that I am 18 or over.',
  start: 'Start',
  starting: 'Starting…',
  codeMissing: 'Enter your invite code.',
  adultMissing: 'Confirm that you are 18 or over to continue.',
  codeNotValid: 'This invite code is not valid. Check it and try again.',
  rateLimited: 'Too many tries. Wait 15 minutes, then try again.',
  offline: 'You seem to be offline. Check your connection and try again.',
  failed: 'Something went wrong. Try again.',

  targetBandTitle: 'Which band are you aiming for?',
  targetBandIntro: 'Optional. You can change it later in Settings.',
  skip: 'Skip for now',

  homeTitle: 'Home',
  homeEmpty: 'Your first challenge will appear here soon.',
  settings: 'Settings',
  backHome: 'Back to Home',

  languageLabel: 'Interface language',
  arabic: 'العربية',
  english: 'English',
  targetBandLabel: 'Target band',
  targetBandNone: 'Not set',
  saved: 'Saved.',
};

const ar: typeof en = {
  appName: 'مسار',
  switchLabel: 'English',
  loading: 'جارٍ التحميل…',
  loadFailed: 'تعذّر تحميل التطبيق. تحقّق من اتصالك وحاول مرة أخرى.',
  retry: 'حاول مرة أخرى',

  welcomeTitle: 'أهلاً بك',
  welcomeIntro: 'أدخل رمز الدعوة لتبدأ التدرّب. لا تحتاج إلى اسم أو بريد إلكتروني.',
  sessionEnded: 'انتهت جلستك كضيف. أدخل رمز دعوة جديدًا لتبدأ من جديد.',
  inviteCodeLabel: 'رمز الدعوة',
  inviteCodeHint: 'عشرة أحرف وأرقام، مثل ABCDE-12345.',
  adultConfirm: 'أؤكّد أن عمري 18 عامًا أو أكثر.',
  start: 'ابدأ',
  starting: 'جارٍ البدء…',
  codeMissing: 'أدخل رمز الدعوة.',
  adultMissing: 'أكّد أن عمرك 18 عامًا أو أكثر للمتابعة.',
  codeNotValid: 'رمز الدعوة هذا غير صالح. تحقّق منه وحاول مرة أخرى.',
  rateLimited: 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.',
  offline: 'يبدو أنك غير متصل. تحقّق من اتصالك وحاول مرة أخرى.',
  failed: 'حدث خطأ. حاول مرة أخرى.',

  targetBandTitle: 'ما الدرجة التي تهدف إليها؟',
  targetBandIntro: 'اختياري. يمكنك تغييرها لاحقًا من الإعدادات.',
  skip: 'تخطَّ الآن',

  homeTitle: 'الرئيسية',
  homeEmpty: 'سيظهر تحدّيك الأول هنا قريبًا.',
  settings: 'الإعدادات',
  backHome: 'العودة إلى الرئيسية',

  languageLabel: 'لغة الواجهة',
  arabic: 'العربية',
  english: 'English',
  targetBandLabel: 'الدرجة المستهدفة',
  targetBandNone: 'غير محدّدة',
  saved: 'تم الحفظ.',
};

export const STRINGS = { ar, en } as const satisfies Record<InterfaceLanguage, typeof en>;
export type Strings = typeof en;
