import { cookies } from 'next/headers';
import Chatbot from '@/components/chat/Chatbot';
import { LanguageProvider } from '@/components/chat/LanguageProvider';

export default async function Home() {
  const locale = (await cookies()).get('cc-language')?.value === 'es' ? 'es' : 'en';
  return <LanguageProvider initialLocale={locale}><Chatbot /></LanguageProvider>;
}
