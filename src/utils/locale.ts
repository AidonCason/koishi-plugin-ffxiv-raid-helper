const locale_defualt: string = 'zh-CN';
const locale_settings = {
  get default(): string {
    return locale_defualt;
  },
  current: <string>locale_defualt
};

const date_locale_options: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

export { locale_settings, date_locale_options };
