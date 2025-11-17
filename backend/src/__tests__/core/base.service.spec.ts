import { BaseService } from '../../core/base.service';
import { supabase } from '../../config/supabase';
import { requestContext } from '../../core/request-context';

// Test entity
interface TestEntity {
  id: string;
  name: string;
  business_id: string;
  created_at: string;
}

class TestService extends BaseService<TestEntity> {
  protected tableName = 'test_entities';
  protected entityName = 'TestEntity';
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService(supabase);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an entity successfully', async () => {
      const mockData = { name: 'Test' };
      const mockResult = { id: '123', name: 'Test', business_id: 'test-business-id', created_at: new Date().toISOString() };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
          }),
        }),
      });

      const result = await service.create(mockData);

      expect(result).toEqual(mockResult);
      expect(supabase.from).toHaveBeenCalledWith('test_entities');
    });

    it('should add businessId from context when multi-tenancy is enabled', async () => {
      const mockData = { name: 'Test' };
      const businessId = 'context-business-id';
      const mockResult = { id: '123', name: 'Test', business_id: businessId, created_at: new Date().toISOString() };

      // Mock request context
      jest.spyOn(requestContext, 'getBusinessIdOrUndefined').mockReturnValue(businessId);

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: insertMock,
      });

      await service.create(mockData);

      expect(insertMock).toHaveBeenCalledWith({ ...mockData, business_id: businessId });
    });
  });

  describe('getById', () => {
    it('should get an entity by ID', async () => {
      const mockId = '123';
      const mockResult = { id: mockId, name: 'Test', business_id: 'test-business-id', created_at: new Date().toISOString() };

      // Mock request context to return undefined (no business_id filtering)
      jest.spyOn(requestContext, 'getBusinessIdOrUndefined').mockReturnValue(undefined);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
          }),
        }),
      });

      const result = await service.getById(mockId);

      expect(result).toEqual(mockResult);
    });

    it('should filter by businessId when context is available', async () => {
      const mockId = '123';
      const businessId = 'context-business-id';
      const mockResult = { id: mockId, name: 'Test', business_id: businessId, created_at: new Date().toISOString() };

      jest.spyOn(requestContext, 'getBusinessIdOrUndefined').mockReturnValue(businessId);

      // Create chainable eq mock
      const singleMock = jest.fn().mockResolvedValue({ data: mockResult, error: null });
      const eqChainMock = { eq: jest.fn(), single: singleMock };
      eqChainMock.eq.mockReturnValue(eqChainMock);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(eqChainMock),
        }),
      });

      const result = await service.getById(mockId);

      expect(result).toEqual(mockResult);
      expect(eqChainMock.eq).toHaveBeenCalledWith('business_id', businessId);
    });
  });

  describe('getAll', () => {
    it('should get all entities', async () => {
      const mockData = [
        { id: '1', name: 'Test 1', business_id: 'test-business-id', created_at: new Date().toISOString() },
        { id: '2', name: 'Test 2', business_id: 'test-business-id', created_at: new Date().toISOString() },
      ];

      // Mock request context to return undefined (no business_id filtering)
      jest.spyOn(requestContext, 'getBusinessIdOrUndefined').mockReturnValue(undefined);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const result = await service.getAll();

      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update an entity', async () => {
      const mockId = '123';
      const mockUpdate = { name: 'Updated' };
      const mockExisting = { id: mockId, name: 'Test', business_id: 'test-business-id', created_at: new Date().toISOString() };
      const mockResult = { ...mockExisting, ...mockUpdate };

      // Mock request context to return undefined (no business_id filtering)
      jest.spyOn(requestContext, 'getBusinessIdOrUndefined').mockReturnValue(undefined);

      // Mock getById
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExisting, error: null }),
          }),
        }),
      });

      // Mock update
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
            }),
          }),
        }),
      });

      const result = await service.update(mockId, mockUpdate);

      expect(result).toEqual(mockResult);
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const mockId = '123';
      const mockExisting = { id: mockId, name: 'Test', business_id: 'test-business-id', created_at: new Date().toISOString() };

      // Mock request context to return undefined (no business_id filtering)
      jest.spyOn(requestContext, 'getBusinessIdOrUndefined').mockReturnValue(undefined);

      // Mock getById
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExisting, error: null }),
          }),
        }),
      });

      // Mock delete
      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await service.delete(mockId);

      expect(supabase.from).toHaveBeenCalledWith('test_entities');
    });
  });
});
