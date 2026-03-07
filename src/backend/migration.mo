import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Storage "blob-storage/Storage";

module {
  // Old data types without price fields
  type OldActor = {
    nextBusinessId : Nat;
    nextUserId : Nat;
    nextProductId : Nat;
    nextVariantId : Nat;
    nextBillId : Nat;
    nextLogId : Nat;
    nextInviteId : Nat;
    businesses : Map.Map<Nat, { id : Nat; name : Text; businessType : { #clothing; #electronics; #groceries; #general }; owner : Principal; subscriptionStatus : { #trial; #active; #grace; #expired }; trialStartDate : Int; trialEndDate : Int }>;
    users : Map.Map<Nat, { userId : Nat; principal : Principal; name : Text; email : Text; phone : Text; businessId : Nat; role : { #owner; #salesman }; isActive : Bool }>;
    principalToUserId : Map.Map<Principal, Nat>;
    productStore : Map.Map<Nat, { id : Nat; businessId : Nat; name : Text; sku : Text; category : Text; description : Text; imageUrls : [Storage.ExternalBlob]; isActive : Bool }>;
    variants : Map.Map<Nat, { id : Nat; productId : Nat; variantName : Text; stockCount : Nat; state : { #available; #locked; #sold }; lockedBy : ?Nat }>;
    bills : Map.Map<Nat, { id : Nat; businessId : Nat; salesmanId : Nat; items : [{ variantId : Nat; quantity : Nat; priceAtSale : Nat }]; status : { #pending; #finalized; #cancelled }; createdAt : Int; finalizedAt : ?Int; totalAmount : Nat }>;
    invites : Map.Map<Nat, { id : Nat; contactInfo : Text; businessId : Nat; status : { #pending; #accepted; #revoked }; invitedAt : Int }>;
    activityLogs : Map.Map<Nat, { logId : Nat; salesmanId : Nat; businessId : Nat; action : Text; timestamp : Int; metadata : Text }>;
  };

  // New data types with price fields added
  type NewActor = {
    nextBusinessId : Nat;
    nextUserId : Nat;
    nextProductId : Nat;
    nextVariantId : Nat;
    nextBillId : Nat;
    nextLogId : Nat;
    nextInviteId : Nat;
    businesses : Map.Map<Nat, { id : Nat; name : Text; businessType : { #clothing; #electronics; #groceries; #general }; owner : Principal; subscriptionStatus : { #trial; #active; #grace; #expired }; trialStartDate : Int; trialEndDate : Int }>;
    users : Map.Map<Nat, { userId : Nat; principal : Principal; name : Text; email : Text; phone : Text; businessId : Nat; role : { #owner; #salesman }; isActive : Bool }>;
    principalToUserId : Map.Map<Principal, Nat>;
    productStore : Map.Map<Nat, { id : Nat; businessId : Nat; name : Text; sku : Text; category : Text; description : Text; basePrice : Nat; imageUrls : [Storage.ExternalBlob]; isActive : Bool }>;
    variants : Map.Map<Nat, { id : Nat; productId : Nat; variantName : Text; price : Nat; stockCount : Nat; state : { #available; #locked; #sold }; lockedBy : ?Nat }>;
    bills : Map.Map<Nat, { id : Nat; businessId : Nat; salesmanId : Nat; items : [{ variantId : Nat; quantity : Nat; priceAtSale : Nat }]; status : { #pending; #finalized; #cancelled }; createdAt : Int; finalizedAt : ?Int; totalAmount : Nat }>;
    invites : Map.Map<Nat, { id : Nat; contactInfo : Text; businessId : Nat; status : { #pending; #accepted; #revoked }; invitedAt : Int }>;
    activityLogs : Map.Map<Nat, { logId : Nat; salesmanId : Nat; businessId : Nat; action : Text; timestamp : Int; metadata : Text }>;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate productStore, adding basePrice field (default to 0 for old entries)
    let newProductStore = old.productStore.map<Nat, { id : Nat; businessId : Nat; name : Text; sku : Text; category : Text; description : Text; imageUrls : [Storage.ExternalBlob]; isActive : Bool }, { id : Nat; businessId : Nat; name : Text; sku : Text; category : Text; description : Text; basePrice : Nat; imageUrls : [Storage.ExternalBlob]; isActive : Bool }>(
      func(_id, oldProduct) {
        {
          id = oldProduct.id;
          businessId = oldProduct.businessId;
          name = oldProduct.name;
          sku = oldProduct.sku;
          category = oldProduct.category;
          description = oldProduct.description;
          basePrice = 0;
          imageUrls = oldProduct.imageUrls;
          isActive = oldProduct.isActive;
        };
      }
    );

    // Migrate variants, adding price field (default to 0 for old entries)
    let newVariants = old.variants.map<Nat, { id : Nat; productId : Nat; variantName : Text; stockCount : Nat; state : { #available; #locked; #sold }; lockedBy : ?Nat }, { id : Nat; productId : Nat; variantName : Text; price : Nat; stockCount : Nat; state : { #available; #locked; #sold }; lockedBy : ?Nat }>(
      func(_id, oldVariant) {
        {
          id = oldVariant.id;
          productId = oldVariant.productId;
          variantName = oldVariant.variantName;
          price = 0;
          stockCount = oldVariant.stockCount;
          state = oldVariant.state;
          lockedBy = oldVariant.lockedBy;
        };
      }
    );

    // Return new actor state with migrated productStore and variants
    {
      old with
      productStore = newProductStore;
      variants = newVariants;
    };
  };
};
