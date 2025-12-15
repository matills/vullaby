import { Request, Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { z } from 'zod';

// Test schemas
const createSchema = z.object({
  name: z.string(),
});

const updateSchema = z.object({
  name: z.string().optional(),
});

// Test entity
interface TestEntity {
  id: string;
  name: string;
  created_at: string;
}

// Test service mock
const mockService = {
  create: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  search: jest.fn(),
};

// Test controller
class TestController extends BaseController<TestEntity, { name: string }, { name?: string }> {
  protected entityName = 'TestEntity';
  protected service = mockService;
  protected createSchema = createSchema;
  protected updateSchema = updateSchema;
}

describe('BaseController', () => {
  let controller: TestController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new TestController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an entity successfully', async () => {
      const mockData = { name: 'Test' };
      const mockResult = { id: '123', name: 'Test', created_at: new Date().toISOString() };

      mockReq.body = mockData;
      mockService.create.mockResolvedValue(mockResult);

      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockService.create).toHaveBeenCalledWith(mockData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 400 for invalid data', async () => {
      mockReq.body = { invalid: 'data' };

      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockService.create).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
        })
      );
    });

    it('should handle service errors', async () => {
      mockReq.body = { name: 'Test' };
      mockService.create.mockRejectedValue(new Error('Database error'));

      await controller.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create TestEntity',
      });
    });
  });

  describe('getById', () => {
    it('should get an entity by ID', async () => {
      const mockResult = { id: '123', name: 'Test', created_at: new Date().toISOString() };

      mockReq.params = { id: '123' };
      mockService.getById.mockResolvedValue(mockResult);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(mockService.getById).toHaveBeenCalledWith('123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 404 when entity not found', async () => {
      mockReq.params = { id: '123' };
      mockService.getById.mockResolvedValue(null);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'TestEntity not found',
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '123' };
      mockService.getById.mockRejectedValue(new Error('Database error'));

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get TestEntity',
      });
    });
  });

  describe('update', () => {
    it('should update an entity successfully', async () => {
      const mockUpdate = { name: 'Updated' };
      const mockResult = { id: '123', name: 'Updated', created_at: new Date().toISOString() };

      mockReq.params = { id: '123' };
      mockReq.body = mockUpdate;
      mockService.update.mockResolvedValue(mockResult);

      await controller.update(mockReq as Request, mockRes as Response);

      expect(mockService.update).toHaveBeenCalledWith('123', mockUpdate);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 400 for invalid data', async () => {
      mockReq.params = { id: '123' };
      mockReq.body = { name: 123 }; // Invalid type

      await controller.update(mockReq as Request, mockRes as Response);

      expect(mockService.update).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 404 when entity not found', async () => {
      mockReq.params = { id: '123' };
      mockReq.body = { name: 'Updated' };
      mockService.update.mockRejectedValue(new Error('TestEntity not found'));

      await controller.update(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('delete', () => {
    it('should delete an entity successfully', async () => {
      mockReq.params = { id: '123' };
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockService.delete).toHaveBeenCalledWith('123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'TestEntity deleted successfully',
      });
    });

    it('should return 404 when entity not found', async () => {
      mockReq.params = { id: '123' };
      mockService.delete.mockRejectedValue(new Error('TestEntity not found'));

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('getAll', () => {
    it('should get all entities', async () => {
      const mockResults = [
        { id: '1', name: 'Test 1', created_at: new Date().toISOString() },
        { id: '2', name: 'Test 2', created_at: new Date().toISOString() },
      ];

      mockService.getAll.mockResolvedValue(mockResults);

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(mockService.getAll).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResults,
      });
    });

    it('should handle service errors', async () => {
      mockService.getAll.mockRejectedValue(new Error('Database error'));

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('search', () => {
    it('should search entities successfully', async () => {
      const mockResults = [
        { id: '1', name: 'Test 1', created_at: new Date().toISOString() },
      ];

      mockReq.query = { query: 'test', limit: '10' };
      mockService.search.mockResolvedValue(mockResults);

      await controller.search(mockReq as Request, mockRes as Response);

      expect(mockService.search).toHaveBeenCalledWith('test', 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResults,
      });
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = { query: 'test' };
      mockService.search.mockResolvedValue([]);

      await controller.search(mockReq as Request, mockRes as Response);

      expect(mockService.search).toHaveBeenCalledWith('test', 10);
    });

    it('should return 501 when search not implemented', async () => {
      const controllerWithoutSearch = new TestController();
      const { search, ...serviceWithoutSearch } = mockService;
      controllerWithoutSearch['service'] = serviceWithoutSearch as any;

      await controllerWithoutSearch.search(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Search not implemented for this resource',
      });
    });
  });
});
