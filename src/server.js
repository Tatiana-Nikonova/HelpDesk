const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
const bodyParser = require('koa-bodyparser');
const fileSystem = require('fs');
const config = require('./config');

const app = new Koa();
const router = new Router();
const path = './src/db.json';

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*' };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set(
        'Access-Control-Allow-Headers',
        ctx.request.get('Access-Control-Request-Headers'),
      );
    }
    ctx.response.status = 204;
  }
});

router.get('/allTickets', async (ctx) => {
  try {
    const fileDB = fileSystem.readFileSync(path);
    const dataFromDB = JSON.parse(fileDB);
    dataFromDB.map((item) => delete item.description);
    ctx.body = dataFromDB;
  } catch (error) {
    console.error('err', error);
    ctx.status = 500;
    ctx.body = 'Internal Server error';
  }
});

router.get('/:id', async (ctx) => {
  try {
    let { id } = ctx.params;
    id = Number(id);
    if (Number.isNaN(id) || !Number.isInteger(id) || id < 0) throw new Error(" incorrect 'id'");
    const fileDB = fileSystem.readFileSync(path);
    const dataFromDB = JSON.parse(fileDB);
    const { description } = dataFromDB.filter((i) => i.id === id)[0];
    ctx.body = description;
  } catch (error) {
    console.error('err', error);
    ctx.status = 500;
    ctx.body = 'Internal Server error';
  }
});

router.post('/status', async (ctx) => {
  try {
    const data = ctx.request.body;
    const fileDB = fileSystem.readFileSync(path);
    const dataFromDB = JSON.parse(fileDB);
    const { id } = data;
    const { status } = data;

    const dataTicket = dataFromDB.find((item) => item.id === Number(id));
    if (dataTicket && dataTicket.status !== status) {
      const index = dataFromDB.findIndex((item) => item === dataTicket);
      if (index > -1) dataFromDB.splice(index, 1);
      dataTicket.status = status;
      fileSystem.writeFileSync(`${__dirname}/db.json`, JSON.stringify([...dataFromDB, dataTicket]));
    } else {
      throw new Error('Status is equals!');
    }
    ctx.body = { success: true };
  } catch (error) {
    console.error('err', error);
    ctx.status = 500;
    ctx.body = 'Internal Server error';
  }
});

router.post('/', async (ctx) => {
  try {
    const data = ctx.request.body;
    const fileDB = fileSystem.readFileSync(path);
    const dataFromDB = JSON.parse(fileDB);
    let result;

    if (Object.keys(data).length < 4) throw new Error(' incorrect object. The number of object keys is not equal to four');
    if (typeof data.name === 'undefined') throw new Error(" incorrect object. Key 'name' not found");
    if (typeof data.description === 'undefined') throw new Error(" incorrect object. Key 'description' not found");
    if (typeof data.status === 'undefined') throw new Error(" incorrect object. Key 'status' not found");
    if (typeof data.created === 'undefined') throw new Error(" incorrect object. Key 'created' not found");

    if (!data.id) {
      if (dataFromDB && dataFromDB.length > 0) {
        dataFromDB.sort((a, b) => b.id - a.id);
        result = { id: dataFromDB[0].id + 1, ...data };
      } else {
        result = { id: 1, ...data };
      }
      fileSystem.writeFileSync(`${__dirname}/db.json`, JSON.stringify([...dataFromDB, result]));
    }

    if (data.id) {
      const ticket = dataFromDB.find((item) => item.id === Number(data.id));
      if (ticket) {
        ticket.name = data.name;
        ticket.description = data.description;
        ticket.status = data.status;
        ticket.created = data.created;
        fileSystem.writeFileSync(`${__dirname}/db.json`, JSON.stringify([...dataFromDB]));
        delete data.id;
      } else throw new Error(`no such id = ${data.id}`);
    }
    ctx.body = data;
  } catch (error) {
    console.error('err', error);
    ctx.status = 500;
    ctx.body = 'Internal Server error';
  }
});

router.post('/id', async (ctx) => {
  try {
    const fileDB = fileSystem.readFileSync(path);
    let { id } = ctx.request.body;
    id = Number(id);
    if (Number.isNaN(id) || !Number.isInteger(id) || id < 0) throw new Error(" incorrect 'id'");
    const dataFromDB = JSON.parse(fileDB);
    const index = dataFromDB.findIndex((i) => i.id === id);
    if (index > -1) dataFromDB.splice(index, 1);
    fileSystem.writeFileSync(`${__dirname}/db.json`, JSON.stringify([...dataFromDB]));
    ctx.body = true;
  } catch (error) {
    console.error('err', error);
    ctx.status = 500;
    ctx.body = 'Internal Server error';
  }
});

app.use(
    koaBody({
      text: true,
      urlencoded: true,
      multipart: true,
      json: true,
    }),
);
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(config.port, () => {
  app.use(async (ctx) => {
    ctx.body = `Server started on port ${config.port}`;
  });
});
