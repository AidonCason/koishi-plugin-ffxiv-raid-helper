import { Argv, Context, h } from 'koishi';
import { date_locale_options, locale_settings } from '../utils/locale';
import {} from 'koishi-plugin-adapter-onebot';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as iconv from 'iconv-lite';
import { getRaidInfo, getServerName, selectRaid } from '../utils/server';
import { createRaid, selectByName } from '../dao/raidDAO';
import { selectSignupByRaidName } from '../dao/raidSignupDAO';

// 指挥开团
const openRaidHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  raid_name: string,
  raid_time: Date
) => {
  if (!argv?.session) return;

  if (!raid_name || raid_name.length <= 0 || !raid_time) {
    return '名称或日期格式错误！参考：开团 114团 2024-01-01T20:00';
  }

  const session = argv.session;
  const one = await selectByName(ctx, raid_name);
  if (one && one.length > 0) {
    return '团已经存在！';
  }
  // TODO: 需要保证在群里调用
  const server_name = await getServerName(ctx, config, session);
  if (!server_name) return;
  await createRaid(ctx, raid_name, 40, session.userId, raid_time, server_name);
  return '开团成功!';
};

const checkNowHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const radi_infos = await getRaidInfo(ctx);
  if (radi_infos) {
    return '当前有如下团:\n' + radi_infos.join('\n');
  } else {
    return '未查询到当前有团';
  }
};

const checkDetailHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;
  const sign_up = await selectSignupByRaidName(ctx, raid_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  } else {
    return (
      '当前报名人数为: ' +
      sign_up.length +
      '\n' +
      sign_up
        .map(
          (s, idx) =>
            '序号: ' +
            (idx + 1) +
            '\n' +
            JSON.parse(s.content)
              .map(j => j[0] + ': ' + j[1])
              .join('\n')
        )
        .join('\n\n')
    );
  }
};

const exportHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  encoding: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (session.platform! in ['onebot', 'slack', 'sandbox']) {
    return '尚未支持的导出平台';
  }

  if (encoding && encoding! in ['utf8', 'gb2312']) {
    return '不支持的编码';
  }
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;

  const sign_up = await selectSignupByRaidName(ctx, raid_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  } else {
    // todo 导出csv文件
    const title =
      JSON.parse(sign_up[0].content)
        .slice(2)
        .map(p => p[0])
        .join(',') +
      '\n' +
      sign_up
        .map(s =>
          JSON.parse(s.content)
            .slice(2)
            .map(p => p[1])
            .join(',')
        )
        .join('\n');
    const buffer = iconv.encode(title, encoding ?? 'utf8');

    const root = path.join(ctx.baseDir, 'temp', 'ffxiv-raid-helper');
    const file_name =
      raid_name +
      '-' +
      raid.raid_time
        .toLocaleString(locale_settings.current, date_locale_options)
        .replaceAll('/', '')
        .replaceAll(' ', '')
        .replaceAll(':', '') +
      '.csv';
    const file_path = path.join(root, file_name);
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(file_path, buffer);
    if (session.platform && session.platform == 'onebot') {
      const file_path = pathToFileURL(path.resolve(root, file_name)).href;
      logger.debug('to send:{}', file_path);
      if (session.channelId.startsWith('private:')) {
        await session.onebot.sendPrivateMsg(session.userId, [
          {
            type: 'file',
            data: {
              file: file_path,
              name: file_name
            }
          }
        ]);
      } else {
        await session.onebot.sendGroupMsg(session.channelId, [
          {
            type: 'file',
            data: {
              file: file_path,
              name: file_name
            }
          }
        ]);
      }
    } else if (session.platform && session.platform == 'slack') {
      const h_file = h.image(pathToFileURL(path.resolve(root, file_name)).href);

      logger.debug(h_file);
      await session.sendQueued(h_file, config.message_interval);
    }
    logger.warn('尚不支持的导出平台');
    session.sendQueued('导出结束', config.message_interval);
  }
};

export { openRaidHandler, checkNowHandler, checkDetailHandler, exportHandler };
