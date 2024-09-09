import { Context } from 'koishi';
import { selectByUserId, selectByUserNameAndServer } from '../dao/blacklistDAO';

export const checkIfInBlackList = async (
  ctx: Context,
  user_id: string,
  user_name: string,
  server: string
) => {
  const userIdBlackList = await selectByUserId(ctx, user_id);
  if (userIdBlackList.length > 0) return true;
  const usernameServerBlackList = await selectByUserNameAndServer(
    ctx,
    user_name,
    server
  );
  if (usernameServerBlackList.length > 0) return true;
  return false;
};
