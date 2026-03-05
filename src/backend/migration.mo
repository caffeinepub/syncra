import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";

module {
  // Business Types
  public type BusinessType = {
    #clothing;
    #electronics;
    #groceries;
    #general;
  };

  public type SubscriptionStatus = {
    #trial;
    #active;
    #grace;
    #expired;
  };

  public type Role = {
    #owner;
    #salesman;
  };

  // Business Entity
  public type Business = {
    id : Nat;
    name : Text;
    businessType : BusinessType;
    owner : Principal;
    subscriptionStatus : SubscriptionStatus;
    trialStartDate : Int;
    trialEndDate : Int;
  };

  module Business {
    public func compare(
      business1 : Business,
      business2 : Business,
    ) : Order.Order {
      switch (Nat.compare(business1.id, business2.id)) {
        case (#equal) {
          Text.compare(business1.name, business2.name);
        };
        case (order) { order };
      };
    };
  };

  // Profile Entity
  public type UserProfile = {
    userId : Nat;
    principal : Principal;
    name : Text;
    email : Text;
    phone : Text;
    businessId : Nat;
    role : Role;
    isActive : Bool;
  };

  module UserProfile {
    public func compare(
      profile1 : UserProfile,
      profile2 : UserProfile,
    ) : Order.Order {
      Nat.compare(profile1.userId, profile2.userId);
    };
  };

  // Salesman Invite
  public type InviteStatus = {
    #pending;
    #accepted;
    #revoked;
  };

  public type SalesmanInvite = {
    id : Nat;
    contactInfo : Text;
    businessId : Nat;
    status : InviteStatus;
    invitedAt : Int;
  };

  // Product/Variant Types
  public type Product = {
    id : Nat;
    businessId : Nat;
    name : Text;
    sku : Text;
    category : Text;
    description : Text;
    imageUrls : [Blob];
    isActive : Bool;
  };

  public type ProductState = {
    #available;
    #locked;
    #sold;
  };

  public type ProductVariant = {
    id : Nat;
    productId : Nat;
    variantName : Text;
    stockCount : Nat;
    state : ProductState;
    lockedBy : ?Nat;
  };

  // Bill Types
  public type BillItem = {
    variantId : Nat;
    quantity : Nat;
    priceAtSale : Nat;
  };

  public type BillStatus = {
    #pending;
    #finalized;
    #cancelled;
  };

  public type BillToken = {
    id : Nat;
    businessId : Nat;
    salesmanId : Nat;
    items : [BillItem];
    status : BillStatus;
    createdAt : Int;
    finalizedAt : ?Int;
    totalAmount : Nat;
  };

  // Activity Log
  public type SalesmanActivityLog = {
    logId : Nat;
    salesmanId : Nat;
    businessId : Nat;
    action : Text;
    timestamp : Int;
    metadata : Text;
  };

  // Types and actor as defined initial Syncra 1.0 state
  public type State = {
    businesses : Map.Map<Nat, Business>;
    users : Map.Map<Nat, UserProfile>;
    principalToUserId : Map.Map<Principal, Nat>;
    productStore : Map.Map<Nat, Product>;
    variants : Map.Map<Nat, ProductVariant>;
    bills : Map.Map<Nat, BillToken>;
    invites : Map.Map<Nat, SalesmanInvite>;
    activityLogs : Map.Map<Nat, SalesmanActivityLog>;
  };

  public func run(old : State) : State {
    old;
  };
};
