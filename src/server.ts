import 'dotenv/config';
import { error_handler } from './utils/error_handler';

process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  throw reason;
});

process.on('uncaughtException', (err: Error) => {
  error_handler.handle_error(err);

  if (!error_handler.is_trusted_error(err)) {
    process.exit(1);
  }
});

import app from './app';

const port = process.env.PORT;

app.listen(port, () =>
  console.log(`start local server at http://localhost:${port}`),
);
