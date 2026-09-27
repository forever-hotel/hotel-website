import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  if (!process.env.DB_HOST) throw new Error('DB_HOST is not defined');
  if (!process.env.DB_PORT) throw new Error('DB_PORT is not defined');
  if (!process.env.DB_USERNAME) throw new Error('DB_USERNAME is not defined');
  if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD is not defined');
  if (!process.env.DB_NAME) throw new Error('DB_NAME is not defined');

  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  };
});
