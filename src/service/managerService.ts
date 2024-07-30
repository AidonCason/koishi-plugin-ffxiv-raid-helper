import { $, Argv, Context, h } from 'koishi';
import { raid_sign_up_table_name, raid_table_name } from '../constant/common';
import { date_locale_options, locale_settings } from '../utils/locale';
import { } from 'koishi-plugin-adapter-onebot';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as iconv from 'iconv-lite';
import { getRaidInfo, getRaids, getServerName } from '../utils/server';

// 指挥开团
const openRaidHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  raid_name: string,
  raid_time: Date
) => {
  if (!argv?.session) return;
  if (!ctx.database) {
    return '数据库未就绪，请联系管理员';
  }

  if (!raid_name || raid_name.length <= 0 || !raid_time) {
    return '名称或日期格式错误！参考：开团 114团 2024-01-01T20:00';
  }

  const session = argv.session;
  const one = await ctx.database.get(raid_table_name, {
    raid_name: { $eq: raid_name }
  });
  if (one && one.length > 0) {
    return '团已经存在！';
  }
  // TODO: 需要保证在群里调用
  const server_name = await getServerName(ctx, session);
  await ctx.database.create(raid_table_name, {
    raid_name,
    max_members: 40,
    raid_leader: session.userId,
    raid_time: raid_time,
    raid_server: server_name,
    allow_sign_up: true,
    created_at: new Date(),
    updated_at: new Date()
  });
  return '开团成功!';
};

const checkNowHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  if (!ctx.database) {
    return '数据库未就绪，请联系管理员';
  }
  const radi_infos = await getRaidInfo(ctx);
  if (radi_infos) {
    return (
      '当前有如下团:\n' +
      radi_infos.join('\n')
    );
  } else {
    return '未查询到当前有团';
  }
};

const checkDetailHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const radis = await getRaids(ctx);
  const radi_infos = await getRaidInfo(ctx, radis);
  if (radi_infos) {
    await session.sendQueued(
      '请输入编号选择要查看的团，当前有如下团:\n' +
      radi_infos
        .map((e, idx) => `${idx + 1}. ${e}`)
        .join('\n'),
      config.message_interval
    );
  } else {
    return '未查询到当前有团';
  }

  const code = parseInt(await session.prompt(), 10) || -1;
  if (!radis[code - 1]) {
    return '团号错误';
  }
  const raid_name = radis[code - 1].raid_name;

  const sign_up = await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name }
  });
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
  const radis = await getRaids(ctx);
  const radi_infos = await getRaidInfo(ctx, radis);
  if (radis) {
    await session.sendQueued(
      '请输入编号选择要查看的团，当前有如下团:\n' +
      radi_infos
        .map((e, idx) => `${idx + 1}. ${e}`)
        .join('\n'),
      config.message_interval
    );
  } else {
    return '未查询到当前有团';
  }

  const code = parseInt(await session.prompt(), 10) || -1;
  const raid = radis[code - 1];
  if (!raid) {
    return '团号错误';
  }
  const raid_name = raid.raid_name;

  const sign_up = await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name }
  });
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
