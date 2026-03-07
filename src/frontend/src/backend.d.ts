import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface BillItem {
    priceAtSale: bigint;
    variantId: bigint;
    quantity: bigint;
}
export type Time = bigint;
export interface Business {
    id: bigint;
    trialEndDate: bigint;
    owner: Principal;
    name: string;
    businessType: BusinessType;
    subscriptionStatus: SubscriptionStatus;
    trialStartDate: bigint;
}
export interface BillToken {
    id: bigint;
    status: BillStatus;
    businessId: bigint;
    createdAt: bigint;
    finalizedAt?: bigint;
    totalAmount: bigint;
    items: Array<BillItem>;
    salesmanId: bigint;
}
export interface ProductVariant {
    id: bigint;
    variantName: string;
    productId: bigint;
    stockCount: bigint;
    state: ProductState;
    lockedBy?: bigint;
    price: bigint;
}
export interface SalesmanActivityLog {
    action: string;
    businessId: bigint;
    metadata: string;
    logId: bigint;
    timestamp: bigint;
    salesmanId: bigint;
}
export interface SalesmanInvite {
    id: bigint;
    status: InviteStatus;
    contactInfo: string;
    businessId: bigint;
    invitedAt: bigint;
}
export interface Product {
    id: bigint;
    sku: string;
    imageUrls: Array<ExternalBlob>;
    businessId: bigint;
    name: string;
    description: string;
    isActive: boolean;
    category: string;
    basePrice: bigint;
}
export interface UserProfile {
    principal: Principal;
    businessId: bigint;
    userId: bigint;
    name: string;
    role: Role;
    isActive: boolean;
    email: string;
    phone: string;
}
export enum BillStatus {
    cancelled = "cancelled",
    pending = "pending",
    finalized = "finalized"
}
export enum BusinessType {
    clothing = "clothing",
    groceries = "groceries",
    general = "general",
    electronics = "electronics"
}
export enum InviteStatus {
    revoked = "revoked",
    pending = "pending",
    accepted = "accepted"
}
export enum ProductState {
    sold = "sold",
    locked = "locked",
    available = "available"
}
export enum Role {
    salesman = "salesman",
    owner = "owner"
}
export enum SubscriptionStatus {
    trial = "trial",
    active = "active",
    expired = "expired",
    grace = "grace"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addProduct(businessId: bigint, name: string, sku: string, category: string, description: string, basePrice: bigint, imageUrls: Array<ExternalBlob>, isActive: boolean): Promise<bigint>;
    addProductVariant(productId: bigint, variantName: string, price: bigint, stockCount: bigint, state: ProductState): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelBill(billId: bigint): Promise<void>;
    createBillToken(businessId: bigint, items: Array<BillItem>, totalAmount: bigint): Promise<bigint>;
    deactivateSalesman(salesmanUserId: bigint): Promise<void>;
    editProduct(productId: bigint, name: string, sku: string, category: string, description: string, basePrice: bigint, imageUrls: Array<ExternalBlob>, isActive: boolean): Promise<void>;
    editProductVariant(variantId: bigint, variantName: string, price: bigint, stockCount: bigint): Promise<void>;
    finalizeBill(billId: bigint): Promise<void>;
    getActivityLogs(businessId: bigint): Promise<Array<SalesmanActivityLog>>;
    getAllBills(): Promise<Array<BillToken>>;
    getAllBusinesses(): Promise<Array<Business>>;
    getAllProductVariants(): Promise<Array<ProductVariant>>;
    getAllProducts(): Promise<Array<Product>>;
    getBillsForBusiness(businessId: bigint): Promise<Array<BillToken>>;
    getBusiness(businessId: bigint): Promise<Business>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getInvitesForBusiness(businessId: bigint): Promise<Array<SalesmanInvite>>;
    getPendingBills(businessId: bigint): Promise<Array<BillToken>>;
    getProductsForBusiness(businessId: bigint): Promise<Array<Product>>;
    getSalesmanActivityLogs(salesmanUserId: bigint): Promise<Array<SalesmanActivityLog>>;
    getTimeDiff(time1: Time, time2: Time): Promise<bigint>;
    getTotalBillsCount(businessId: bigint): Promise<bigint>;
    getTotalSales(businessId: bigint): Promise<bigint>;
    getUserById(userId: bigint): Promise<UserProfile | null>;
    getUserProfile(userPrincipal: Principal): Promise<UserProfile | null>;
    getVariantsForProduct(productId: bigint): Promise<Array<ProductVariant>>;
    inviteSalesman(businessId: bigint, contactInfo: string): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    lockVariant(variantId: bigint): Promise<void>;
    lookupInvite(contactInfo: string): Promise<SalesmanInvite | null>;
    registerBusiness(name: string, businessType: BusinessType, subscriptionStatus: SubscriptionStatus, trialStartDate: bigint, trialEndDate: bigint): Promise<bigint>;
    releaseVariantLock(variantId: bigint): Promise<void>;
    revokeInvite(inviteId: bigint): Promise<void>;
    saveCallerUserProfile(name: string, email: string, phone: string, businessId: bigint, role: Role, isActive: boolean): Promise<void>;
    updateSubscription(businessId: bigint, newStatus: SubscriptionStatus): Promise<void>;
}
