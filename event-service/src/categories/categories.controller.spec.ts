import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

type CategoriesServiceMock = {
  getAll: jest.Mock<Promise<unknown[]>, []>;
  create: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  update: jest.Mock<Promise<unknown>, [string, Record<string, unknown>]>;
  remove: jest.Mock<Promise<unknown>, [string]>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createCategoriesServiceMock = (): CategoriesServiceMock => ({
  getAll: createMock<Promise<unknown[]>, []>(),
  create: createMock<Promise<unknown>, [Record<string, unknown>]>(),
  update: createMock<Promise<unknown>, [string, Record<string, unknown>]>(),
  remove: createMock<Promise<unknown>, [string]>(),
});

describe('CategoriesController', () => {
  let categoriesService: CategoriesServiceMock;
  let controller: CategoriesController;

  beforeEach(() => {
    categoriesService = createCategoriesServiceMock();
    controller = new CategoriesController(
      categoriesService as unknown as CategoriesService,
    );
  });

  it('delegue la liste des categories', async () => {
    categoriesService.getAll.mockResolvedValue([{ id: 'category-1' }]);

    await expect(controller.getAll()).resolves.toEqual([{ id: 'category-1' }]);

    expect(categoriesService.getAll).toHaveBeenCalledTimes(1);
  });

  it('delegue creation, mise a jour et suppression', async () => {
    categoriesService.create.mockResolvedValue({
      id: 'category-1',
      name: 'Tech',
    });
    categoriesService.update.mockResolvedValue({
      id: 'category-1',
      name: 'Music',
    });
    categoriesService.remove.mockResolvedValue({
      id: 'category-1',
      name: 'Music',
    });

    await expect(controller.create({ name: 'Tech' })).resolves.toEqual({
      id: 'category-1',
      name: 'Tech',
    });
    await expect(
      controller.update('category-1', { name: 'Music' }),
    ).resolves.toEqual({
      id: 'category-1',
      name: 'Music',
    });
    await expect(controller.remove('category-1')).resolves.toEqual({
      id: 'category-1',
      name: 'Music',
    });

    expect(categoriesService.create).toHaveBeenCalledWith({ name: 'Tech' });
    expect(categoriesService.update).toHaveBeenCalledWith('category-1', {
      name: 'Music',
    });
    expect(categoriesService.remove).toHaveBeenCalledWith('category-1');
  });
});
