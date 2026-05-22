const Module = require('node:module');

const originalLoad = Module._load;

class FakePrismaClient {
  async $connect() {}

  async $disconnect() {}
}

Module._load = function patchedPrismaLoad(request, parent, isMain) {
  if (request === '@prisma/client' || request === '.prisma/client/default') {
    return {
      PrismaClient: FakePrismaClient,
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};
