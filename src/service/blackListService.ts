import { Context } from 'koishi';
import {
  createBlackList,
  selectByUserId,
  selectByUserNameAndServer
} from '../dao/blacklistDAO';

export const checkIfInBlackList = async (
  ctx: Context,
  user_id: string,
  user_name: string,
  server: string
) => {
  // 先根据用户id（QQ号）查找是否在黑名单中
  const userIdBlackList = await selectByUserId(ctx, user_id);
  if (userIdBlackList.length > 0) return true;
  // 再根据游戏名和区服查找是否在黑名单中
  const usernameServerBlackList = await selectByUserNameAndServer(
    ctx,
    user_name,
    server
  );
  if (usernameServerBlackList.length > 0) {
    // 如果在黑名单中，将用户id加入黑名单
    await createBlackList(
      ctx,
      user_id,
      user_name,
      server,
      '游戏名和区服在黑名单中，机器人自动加入黑名单'
    );
    return true;
  }
  return false;
};
