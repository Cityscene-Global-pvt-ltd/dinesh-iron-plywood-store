import { createApi } from "@reduxjs/toolkit/query/react";
import api from "@/api/axios";

const axiosBaseQuery =
  () =>
  async ({ url, method, data, params }: any) => {
    try {
      const result = await api({ url, method, data, params });
      return { data: result.data };
    } catch (axiosError: any) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        },
      };
    }
  };

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    "Company",
    "DummyCompany",
    "Supplier",
    "Inventory",
    "Sales",
    "RolePermissions",
    "Employees",
    "References",
    "Settings",
    "Expenses",
    "Notifications",
    "Accounting",
    "InternalLedger",
    "Customers",
    "Leaves",
    "Advances",
    "Salary",
  ],
  endpoints: (builder) => ({
    getCompany: builder.query<any, void>({
      query: () => ({ url: "api/settings/company", method: "get" }),
      providesTags: ["Company"],
    }),
    updateCompany: builder.mutation({
      query: (data) => ({ url: "api/settings/company", method: "put", data }),
      invalidatesTags: ["Company"],
    }),
    getDummyCompany: builder.query<any, void>({
      query: () => ({ url: "api/settings/dummy-company", method: "get" }),
      providesTags: ["DummyCompany"],
    }),
    updateDummyCompany: builder.mutation({
      query: (data) => ({
        url: "api/settings/dummy-company",
        method: "put",
        data,
      }),
      invalidatesTags: ["DummyCompany"],
    }),
    getRolePermissions: builder.query<any, void>({
      query: () => ({ url: "api/settings/role-permissions", method: "get" }),
      providesTags: ["RolePermissions"],
    }),
    getRolePermissionByRole: builder.query<any, string>({
      query: (role) => ({
        url: `api/settings/role-permissions/${role}`,
        method: "get",
      }),
      providesTags: ["RolePermissions"],
    }),
    createRolePermission: builder.mutation({
      query: (data) => ({
        url: "api/settings/role-permissions",
        method: "post",
        data,
      }),
      invalidatesTags: ["RolePermissions"],
    }),
    getSuppliers: builder.query<any, void>({
      query: () => ({ url: "api/suppliers", method: "get" }),
      providesTags: ["Supplier"],
    }),
    addSupplier: builder.mutation({
      query: (data) => ({ url: "api/suppliers", method: "post", data }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/suppliers/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    deleteSupplier: builder.mutation({
      query: ({ id }) => ({
        url: `api/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier", "InternalLedger"],
    }),
    addSupplierOrder: builder.mutation({
      query: (data) => ({ url: "api/suppliers/orders", method: "post", data }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplierOrder: builder.mutation({
      query: ({ orderId, ...body }) => ({
        url: `api/suppliers/orders/${orderId}`,
        method: "put",
        data: body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    deleteSupplierOrder: builder.mutation({
      query: ({ orderId }) => ({
        url: `api/suppliers/orders/${orderId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),
    receivePurchaseOrder: builder.mutation({
      query: (payload) => ({
        url: "api/suppliers/orders/receive-order",
        method: "POST",
        data: payload,
      }),
      invalidatesTags: ["Supplier", "Inventory"],
    }),
    addBillPayment: builder.mutation({
      query: (data) => ({
        url: "api/suppliers/payments",
        method: "POST",
        data,
      }),
      invalidatesTags: ["Supplier"],
    }),
    deleteBillPayment: builder.mutation({
      query: (id) => ({
        url: `api/suppliers/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),
    getInventory: builder.query<any[], void>({
      query: () => ({ url: "api/inventory", method: "get" }),
      providesTags: ["Inventory"],
    }),
    addProduct: builder.mutation({
      query: (data) => ({ url: "api/inventory", method: "post", data }),
      invalidatesTags: ["Inventory"],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/inventory/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `api/inventory/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),
    getSales: builder.query<any[], void>({
      query: () => ({ url: "api/sales", method: "get" }),
      providesTags: ["Sales"],
    }),
    addSale: builder.mutation({
      query: (data) => ({ url: "api/sales", method: "post", data }),
      invalidatesTags: [
        "Sales",
        "Inventory",
        "Notifications",
        "References",
        "InternalLedger",
      ],
    }),
    updateSale: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/sales/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: [
        "Sales",
        "Notifications",
        "References",
        "InternalLedger",
        "Inventory",
      ],
    }),
    deleteSale: builder.mutation({
      query: (id) => ({
        url: `api/sales/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Sales",
        "Inventory",
        "Notifications",
        "InternalLedger",
      ],
    }),
    getAnomalies: builder.query<any[], void>({
      query: () => ({ url: "api/sales/anomalies/list", method: "get" }),
      providesTags: ["Sales"],
    }),
    resolveAnomaly: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/sales/anomalies/${id}/resolve`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Sales", "Customers", "Inventory", "InternalLedger"],
    }),
    addReturn: builder.mutation({
      query: (data) => ({ url: "api/sales/return", method: "post", data }),
      invalidatesTags: ["Sales", "Inventory", "Notifications"],
    }),
    getReturns: builder.query<any[], void>({
      query: () => ({ url: "api/sales/return", method: "get" }),
      providesTags: ["Sales"],
    }),
    deleteReturn: builder.mutation({
      query: (id) => ({
        url: `api/sales/return/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Sales", "Inventory", "Notifications", "InternalLedger"],
    }),
    getEmployees: builder.query<any[], void>({
      query: () => ({ url: "api/employees", method: "get" }),
      providesTags: ["Employees"],
    }),
    addEmployee: builder.mutation({
      query: (data) => ({ url: "api/employees", method: "post", data }),
      invalidatesTags: ["Employees"],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/employees/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Employees"],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `api/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employees"],
    }),
    resetAllPasswords: builder.mutation({
      query: (data) => ({
        url: "api/employees/reset-all-passwords",
        method: "POST",
        data,
      }),
      invalidatesTags: ["Employees"],
    }),
    login: builder.mutation({
      query: (data) => ({ url: "api/auth/login", method: "post", data }),
    }),
    getReferences: builder.query<any[], void>({
      query: () => ({ url: "api/references", method: "get" }),
      providesTags: ["References"],
    }),
    addReference: builder.mutation({
      query: (data) => ({ url: "api/references", method: "post", data }),
      invalidatesTags: ["References"],
    }),
    updateReference: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/references/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["References"],
    }),
    deleteReference: builder.mutation({
      query: (id) => ({
        url: `api/references/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["References"],
    }),
    redeemReferencePoints: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/references/${id}/redeem`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["References"],
    }),
    getReferenceRedemptions: builder.query<any[], string>({
      query: (id) => ({ url: `api/references/${id}/redemptions`, method: "GET" }),
      providesTags: ["References"],
    }),
    getAllRedemptions: builder.query<any[], void>({
      query: () => ({ url: "api/references/redemptions/all", method: "GET" }),
      providesTags: ["References"],
    }),
    cancelRedemption: builder.mutation({
      query: (redemptionId) => ({
        url: `api/references/redemptions/${redemptionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["References"],
    }),
    getSettings: builder.query<any, void>({
      query: () => ({ url: "api/settings", method: "get" }),
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({
        url: "api/settings/update",
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Settings"],
    }),
    exportDatabase: builder.mutation({
      query: () => ({
        url: "api/settings/export-database",
        method: "POST",
      }),
    }),
    changePassword: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/employees/${id}/change-password`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getExpenses: builder.query<any[], void>({
      query: () => ({ url: "api/expenses", method: "get" }),
      providesTags: ["Expenses"],
    }),
    addExpense: builder.mutation({
      query: (data) => ({ url: "api/expenses", method: "post", data }),
      invalidatesTags: ["Expenses"],
    }),
    updateExpense: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/expenses/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Expenses"],
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({
        url: `api/expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Expenses"],
    }),
    getNotifications: builder.query({
      query: (params) => ({
        url: "api/notifications/list",
        method: "get",
        params,
      }),
      providesTags: ["Notifications"],
    }),

    getUnreadCount: builder.query({
      query: (params) => ({
        url: "api/notifications/count",
        method: "get",
        params,
      }),
      providesTags: ["Notifications"],
    }),

    markAsRead: builder.mutation({
      query: (data) => ({
        url: "api/notifications/read",
        method: "post",
        data,
      }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `api/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),

    clearAllNotifications: builder.mutation({
      query: () => ({
        url: "api/notifications/clear-all",
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
    sendInvoiceMail: builder.mutation({
      query: (data) => ({
        url: "api/sales/send-invoice-mail",
        method: "post",
        data,
      }),
    }),
    getVouchers: builder.query<any[], void>({
      query: () => ({ url: "api/accounting", method: "get" }),
      providesTags: ["Accounting"],
    }),
    addVoucher: builder.mutation({
      query: (data) => ({ url: "api/accounting", method: "post", data }),
      invalidatesTags: ["Accounting"],
    }),
    updateVoucher: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/accounting/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Accounting"],
    }),
    deleteVoucher: builder.mutation({
      query: (id) => ({
        url: `api/accounting/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Accounting", "InternalLedger", "Sales"],
    }),
    approveVoucher: builder.mutation({
      query: ({ id, status }) => ({
        url: `api/accounting/${id}/approve`,
        method: "PUT",
        data: { status }
      }),
      invalidatesTags: ["Accounting", "InternalLedger", "Sales"],
    }),
    updateSalePayment: builder.mutation({
      query: ({ id, ...paymentData }) => ({
        url: `api/sales/${id}/update-payment`,
        method: "POST",
        data: paymentData,
      }),
      invalidatesTags: ["Sales"],
    }),
    deleteSalePayment: builder.mutation({
      query: (paymentId) => ({
        url: `api/sales/payment/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Sales"],
    }),
    uploadInventory: builder.mutation({
      query: (formData) => ({
        url: "api/inventory/upload-inventory",
        method: "POST",
        data: formData,
      }),
      invalidatesTags: ["Inventory"],
    }),
    getInternalLedgers: builder.query<any, string | void>({
      query: (type) => ({
        url: "api/internal-ledger",
        method: "get",
        params: type ? { type } : undefined,
      }),
      providesTags: ["InternalLedger"],
    }),
    addInternalLedgerPayment: builder.mutation({
      query: (body) => ({
        url: "api/internal-ledger/payment",
        method: "post",
        data: body,
      }),
      invalidatesTags: ["InternalLedger"],
    }),
    deleteInternalLedgerPayment: builder.mutation({
      query: ({ paymentId, ledgerId }) => ({
        url: `api/internal-ledger/payment/${paymentId}`,
        method: "DELETE",
        params: { ledgerId },
      }),
      invalidatesTags: ["InternalLedger"],
    }),
    getCustomers: builder.query<any[], void>({
      query: () => ({ url: "api/customers", method: "get" }),
      providesTags: ["Customers"],
    }),
    addCustomer: builder.mutation({
      query: (data) => ({ url: "api/customers", method: "post", data }),
      invalidatesTags: ["Customers"],
    }),
    updateCustomer: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/customers/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Customers"],
    }),
    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: `api/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),
    mergeCustomers: builder.mutation({
      query: (data) => ({ url: "api/customers/merge", method: "post", data }),
      invalidatesTags: ["Customers", "Sales", "InternalLedger"],
    }),
    getLeaves: builder.query<any[], void>({
      query: () => ({ url: "api/leaves", method: "get" }),
      providesTags: ["Leaves"],
    }),
    addLeave: builder.mutation({
      query: (data) => ({ url: "api/leaves", method: "post", data }),
      invalidatesTags: ["Leaves", "Notifications"],
    }),
    updateLeaveStatus: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/leaves/${id}/status`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Leaves", "Notifications"],
    }),
    deleteLeave: builder.mutation({
      query: (id) => ({
        url: `api/leaves/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Leaves"],
    }),
    getAdvances: builder.query<any, void>({
      query: () => ({ url: "api/advances", method: "get" }),
      providesTags: ["Advances"],
    }),
    addAdvance: builder.mutation({
      query: (data) => ({
        url: "api/advances",
        method: "post",
        data,
      }),
      invalidatesTags: ["Advances"],
    }),
    updateAdvanceStatus: builder.mutation({
      query: (data) => ({
        url: "api/advances/status",
        method: "put",
        data,
      }),
      invalidatesTags: ["Advances"],
    }),
    deleteAdvance: builder.mutation({
      query: (id) => ({
        url: `api/advances/${id}`,
        method: "delete",
      }),
      invalidatesTags: ["Advances"],
    }),

    getSalarySummary: builder.query<any, { month: number; year: number }>({
      query: ({ month, year }) => ({ url: `api/salary/summary/${month}/${year}`, method: "get" }),
      providesTags: ["Salary", "Leaves", "Advances"],
    }),

    getCustomerItemPrices: builder.query<Record<string, number>, string>({
      query: (customerId) => ({ url: `api/sales/customer-prices/${customerId}`, method: "get" }),
    }),    paySalary: builder.mutation({
      query: (data) => ({
        url: "api/salary/pay",
        method: "post",
        data,
      }),
      invalidatesTags: ["Salary", "Expenses", "Employees"],
    }),
  }),
});

export const {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  useGetDummyCompanyQuery,
  useUpdateDummyCompanyMutation,
  useCreateRolePermissionMutation,
  useGetRolePermissionByRoleQuery,
  useGetRolePermissionsQuery,
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useAddSupplierOrderMutation,
  useAddBillPaymentMutation,
  useDeleteBillPaymentMutation,
  useDeleteSupplierMutation,
  useAddProductMutation,
  useGetInventoryQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAddSaleMutation,
  useGetSalesQuery,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useAddReturnMutation,
  useGetReturnsQuery,
  useDeleteReturnMutation,
  useAddEmployeeMutation,
  useGetEmployeesQuery,
  useDeleteEmployeeMutation,
  useUpdateEmployeeMutation,
  useResetAllPasswordsMutation,
  useLoginMutation,
  useGetReferencesQuery,
  useAddReferenceMutation,
  useUpdateReferenceMutation,
  useDeleteReferenceMutation,
  useRedeemReferencePointsMutation,
  useGetReferenceRedemptionsQuery,
  useLazyGetReferenceRedemptionsQuery,
  useGetAllRedemptionsQuery,
  useCancelRedemptionMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useExportDatabaseMutation,
  useChangePasswordMutation,
  useGetExpensesQuery,
  useAddExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
  useSendInvoiceMailMutation,
  useGetVouchersQuery,
  useAddVoucherMutation,
  useUpdateVoucherMutation,
  useDeleteVoucherMutation,
  useUpdateSalePaymentMutation,
  useDeleteSalePaymentMutation,
  useUploadInventoryMutation,
  useUpdateSupplierOrderMutation,
  useDeleteSupplierOrderMutation,
  useReceivePurchaseOrderMutation,
  useGetInternalLedgersQuery,
  useAddInternalLedgerPaymentMutation,
  useDeleteInternalLedgerPaymentMutation,
  useGetCustomersQuery,
  useAddCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useMergeCustomersMutation,
  useApproveVoucherMutation,
  useGetLeavesQuery,
  useAddLeaveMutation,
  useUpdateLeaveStatusMutation,
  useDeleteLeaveMutation,
  useGetAdvancesQuery,
  useAddAdvanceMutation,
  useUpdateAdvanceStatusMutation,
  useDeleteAdvanceMutation,
  useGetAnomaliesQuery,
  useResolveAnomalyMutation,
  useGetSalarySummaryQuery,
  usePaySalaryMutation,
  useGetCustomerItemPricesQuery,
  useLazyGetCustomerItemPricesQuery,
} = apiSlice;
