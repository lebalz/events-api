jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: jest.requireActual('prismock').PrismockClient,
  };
});