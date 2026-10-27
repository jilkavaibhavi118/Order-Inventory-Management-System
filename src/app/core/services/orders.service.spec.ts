import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let httpTestingController: HttpTestingController;
  const endpoint = `${environment.apiUrl}/api/Order`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(OrdersService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads orders using pagination and optional filter parameters', () => {
    service.getOrders({
      page: 2,
      pageSize: 25,
      status: 'Processing',
      fromDate: '2026-04-01T00:00:00.000Z',
      toDate: '2026-04-30T23:59:59.999Z'
    }).subscribe();

    const request = httpTestingController.expectOne(
      `${endpoint}?page=2&pageSize=25&status=Processing&fromDate=2026-04-01T00:00:00.000Z&toDate=2026-04-30T23:59:59.999Z`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ page: 2, pageSize: 25, totalCount: 0, orders: [] });
  });

  it('uses the documented create, detail, update, status, and delete endpoints', () => {
    const requestBody = {
      customerId: 'customer-id',
      warehouseId: 'warehouse-id',
      items: [{ productId: 'product-id', quantity: 2 }]
    };

    service.createOrder(requestBody).subscribe();
    const createRequest = httpTestingController.expectOne(endpoint);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(requestBody);
    createRequest.flush({});

    service.getOrder('order-id').subscribe();
    const detailRequest = httpTestingController.expectOne(`${endpoint}/order-id`);
    expect(detailRequest.request.method).toBe('GET');
    detailRequest.flush({ id: 'order-id', ...requestBody });

    service.updateOrder('order-id', requestBody).subscribe();
    const updateRequest = httpTestingController.expectOne(`${endpoint}/order-id`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(requestBody);
    updateRequest.flush({});

    service.updateStatus('order-id', { status: 'Shipped' }).subscribe();
    const statusRequest = httpTestingController.expectOne(`${endpoint}/order-id/status`);
    expect(statusRequest.request.method).toBe('PATCH');
    expect(statusRequest.request.body).toEqual({ status: 'Shipped' });
    statusRequest.flush({});

    service.deleteOrder('order-id').subscribe();
    const deleteRequest = httpTestingController.expectOne(`${endpoint}/order-id`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({});
  });
});
