import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGUAGES, DEFAULT_LANGUAGE, UI, localeOrDefault, directionFor, translate } from '../web/i18n.js';
import { BOT_LANGUAGES, botLocale, botText } from '../tgcloud/lib/bot-i18n.js';

const required = ['en','fa','ar','tr','ru','hi'];
const code = p => readFileSync(new URL(p,import.meta.url),'utf8');
const html = code('../web/index.html');
const web = code('../web/app.js');
const schema = code('../tgcloud/schema.js');
const getProfile = code('../tgcloud/endpoints/getProfile.js');
const saveSettings = code('../tgcloud/endpoints/saveSettings.js');
const handler = code('../tgcloud/handlers/message.js');

test('six languages with English default and proper text direction',()=>{
 assert.equal(DEFAULT_LANGUAGE,'en');
 assert.deepEqual(LANGUAGES.map(x=>x.code),required);
 assert.equal(localeOrDefault('nonsense'),'en');
 assert.equal(localeOrDefault(undefined),'en');
 for(const language of required) assert.equal(directionFor(language),['fa','ar'].includes(language)?'rtl':'ltr');
 assert.match(html,/<html lang="en" dir="ltr">/);
 assert.match(html,/<select id="language-select"/);
 for(const language of required) assert.match(html,new RegExp('value="'+language+'"'));
});
test('all six UI catalogs have nonempty and matching translations',()=>{
 const keys = Object.keys(UI.en).sort();
 assert.ok(keys.length>=50);
 for(const language of required){
  assert.deepEqual(Object.keys(UI[language]).sort(),keys,'missing/extra keys for '+language);
  for(const key of keys){
   assert.ok(UI[language][key] && UI[language][key].trim() !== '',language+':'+key);
   assert.equal(translate(language,key),UI[language][key]);
  }
 }
});
test('all localizable static text and accessibility fields exist in dictionary',()=>{
 const keys = [...html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)].map(match=>match[1]);
 for(const key of keys) assert.ok(UI.en[key], 'missing translated DOM field: '+key);
 assert.ok(keys.length>=30);
 assert.match(web,/\[data-state-key\]/);
 assert.match(web,/directionFor\(locale\)/);
 assert.match(web,/localeOrDefault\(profile\?\.language\)/);
});
test('persisted language supports all six, and new users default to English',()=>{
 for(const language of required) assert.ok(saveSettings.includes("'"+language+"'"));
 assert.match(getProfile,/saved\?\.language\|\|'en'/);
 assert.match(schema,/\.default\('en'\)/);
 assert.match(handler,/\/language/);
 assert.deepEqual(BOT_LANGUAGES,required);
 assert.equal(botLocale('broken'),'en');
});
test('bot translations have parity and complete messages',()=>{
 const botKeys=['help','priceUsage','noFeed','source','observation','indicative','signalOff','signalsUnavailable','noSignals','signalTitle','helpShort','languageUsage','languageSaved','languageError'];
 for(const lang of required) for(const key of botKeys){
  assert.ok(botText(lang,key) && botText(lang,key)!==key, lang+' bot missing '+key);
 }
 assert.match(botText('ar','help'),/العربية|البدء/);
 assert.match(botText('hi','help'),/शुरू/);
});
