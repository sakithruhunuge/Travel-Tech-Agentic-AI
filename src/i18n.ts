import {getRequestConfig} from 'next-intl/server';
 
// Can be imported from a shared config
const locales = ['en', 'fr', 'de', 'si'];
 
export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;
  
  if (!locale || !locales.includes(locale as string)) {
    locale = 'en';
  }
 
  return {
    locale: locale as string,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
