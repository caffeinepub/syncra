import Text "mo:core/Text";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  // =========================
  // Types/Modules/State
  // =========================

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
    contactInfo : Text; // Email or phone
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
    imageUrls : [Storage.ExternalBlob];
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
    lockedBy : ?Nat; // userId who locked it
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

  // Comparison functions for sorting
  module Comparison {
    public func compareBusinessesById(b1 : Business, b2 : Business) : Order.Order {
      Nat.compare(b1.id, b2.id);
    };

    public func compareUsersById(u1 : UserProfile, u2 : UserProfile) : Order.Order {
      Nat.compare(u1.userId, u2.userId);
    };

    public func compareProductsById(p1 : Product, p2 : Product) : Order.Order {
      Nat.compare(p1.id, p2.id);
    };

    public func compareVariantsById(v1 : ProductVariant, v2 : ProductVariant) : Order.Order {
      Nat.compare(v1.id, v2.id);
    };

    public func compareBillsById(b1 : BillToken, b2 : BillToken) : Order.Order {
      Nat.compare(b1.id, b2.id);
    };
  };

  // State Initialization
  var nextBusinessId = 1;
  var nextUserId = 1;
  var nextProductId = 1;
  var nextVariantId = 1;
  var nextBillId = 1;
  var nextLogId = 1;
  var nextInviteId = 1;

  let businesses = Map.empty<Nat, Business>();
  let users = Map.empty<Nat, UserProfile>();
  let principalToUserId = Map.empty<Principal, Nat>();
  let productStore = Map.empty<Nat, Product>();
  let variants = Map.empty<Nat, ProductVariant>();
  let bills = Map.empty<Nat, BillToken>();
  let invites = Map.empty<Nat, SalesmanInvite>();
  let activityLogs = Map.empty<Nat, SalesmanActivityLog>();

  // =========================
  // Mixins
  // =========================

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // =========================
  // Helper Functions
  // =========================

  func getUserByPrincipal(principal : Principal) : ?UserProfile {
    switch (principalToUserId.get(principal)) {
      case (null) { null };
      case (?userId) { users.get(userId) };
    };
  };

  func requireUser(caller : Principal) : UserProfile {
    switch (getUserByPrincipal(caller)) {
      case (null) { Runtime.trap("Unauthorized: User profile not found") };
      case (?user) {
        if (not user.isActive) {
          Runtime.trap("Unauthorized: User account is inactive");
        };
        user;
      };
    };
  };

  func requireOwner(caller : Principal, businessId : Nat) : UserProfile {
    let user = requireUser(caller);
    if (user.businessId != businessId) {
      Runtime.trap("Unauthorized: User does not belong to this business");
    };
    switch (user.role) {
      case (#owner) { user };
      case (#salesman) { Runtime.trap("Unauthorized: Only business owners can perform this action") };
    };
  };

  func requireBusinessMember(caller : Principal, businessId : Nat) : UserProfile {
    let user = requireUser(caller);
    if (user.businessId != businessId) {
      Runtime.trap("Unauthorized: User does not belong to this business");
    };
    user;
  };

  func requireSalesman(caller : Principal, businessId : Nat) : UserProfile {
    let user = requireUser(caller);
    if (user.businessId != businessId) {
      Runtime.trap("Unauthorized: User does not belong to this business");
    };
    switch (user.role) {
      case (#salesman) { user };
      case (#owner) { Runtime.trap("Unauthorized: Only salesmen can perform this action") };
    };
  };

  func logActivity(salesmanId : Nat, businessId : Nat, action : Text, metadata : Text) {
    let logId = nextLogId;
    let log : SalesmanActivityLog = {
      logId;
      salesmanId;
      businessId;
      action;
      timestamp = Time.now();
      metadata;
    };
    activityLogs.add(logId, log);
    nextLogId += 1;
  };

  // =========================
  // User Profile Management
  // =========================

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    getUserByPrincipal(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : {
    name : Text;
    email : Text;
    phone : Text;
    businessId : Nat;
    role : Role;
    isActive : Bool;
  }) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Verify business exists
    switch (businesses.get(profile.businessId)) {
      case (null) { Runtime.trap("Business does not exist") };
      case (?business) {
        // Only allow owner role if caller is the business owner
        switch (profile.role) {
          case (#owner) {
            if (business.owner != caller) {
              Runtime.trap("Unauthorized: Only business owner can create owner profile");
            };
          };
          case (#salesman) {
            // Salesman must have a valid invite - FIXED: proper operator precedence
            let matchingInvite = invites.values().find(
              func(invite : SalesmanInvite) : Bool {
                invite.businessId == profile.businessId
                and invite.status == #pending
                and (invite.contactInfo == profile.email or invite.contactInfo == profile.phone);
              }
            );
            switch (matchingInvite) {
              case (null) { Runtime.trap("No valid invite found for this salesman") };
              case (?foundInvite) {
                // Mark the invite as accepted - FIXED: now marks as accepted
                let updatedInvites = invites.map<Nat, SalesmanInvite, SalesmanInvite>(
                  func(id, invite) {
                    if (invite.businessId == profile.businessId and invite.status == #pending and (invite.contactInfo == profile.email or invite.contactInfo == profile.phone)) {
                      { invite with status = #accepted };
                    } else {
                      invite;
                    };
                  }
                );
                invites.clear();
                for ((id, invite) in updatedInvites.entries()) {
                  invites.add(id, invite);
                };
              };
            };
          };
        };
      };
    };

    let userId = nextUserId;
    let userProfile : UserProfile = {
      userId;
      principal = caller;
      name = profile.name;
      email = profile.email;
      phone = profile.phone;
      businessId = profile.businessId;
      role = profile.role;
      isActive = profile.isActive;
    };

    users.add(userId, userProfile);
    principalToUserId.add(caller, userId);
    nextUserId += 1;
  };

  public query ({ caller }) func getUserProfile(userPrincipal : Principal) : async ?UserProfile {
    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      // Check if caller is owner of the same business
      let callerUser = getUserByPrincipal(caller);
      let targetUser = getUserByPrincipal(userPrincipal);

      switch (callerUser, targetUser) {
        case (?cu, ?tu) {
          if (cu.businessId != tu.businessId or cu.role != #owner) {
            Runtime.trap("Unauthorized: Can only view profiles from your own business as owner");
          };
        };
        case (_, _) {
          Runtime.trap("Unauthorized: Can only view your own profile");
        };
      };
    };
    getUserByPrincipal(userPrincipal);
  };

  // =========================
  // Business Management
  // =========================

  public shared ({ caller }) func registerBusiness(
    name : Text,
    businessType : BusinessType,
    subscriptionStatus : SubscriptionStatus,
    trialStartDate : Int,
    trialEndDate : Int,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register businesses");
    };

    if (name == "" or trialEndDate <= trialStartDate) {
      Runtime.trap("Invalid business data");
    };

    // Check if caller already owns a business
    let existingBusiness = businesses.values().find(
      func(b : Business) : Bool {
        b.owner == caller;
      }
    );
    switch (existingBusiness) {
      case (?_) { Runtime.trap("User already owns a business") };
      case (null) {};
    };

    let businessId = nextBusinessId;
    let business : Business = {
      id = businessId;
      name;
      businessType;
      owner = caller;
      subscriptionStatus;
      trialStartDate;
      trialEndDate;
    };

    businesses.add(businessId, business);
    nextBusinessId += 1;
    businessId;
  };

  public query ({ caller }) func getBusiness(businessId : Nat) : async Business {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view businesses");
    };

    // User can only view their own business
    let user = requireBusinessMember(caller, businessId);

    switch (businesses.get(businessId)) {
      case (null) { Runtime.trap("Business does not exist") };
      case (?business) { business };
    };
  };

  public query ({ caller }) func getAllBusinesses() : async [Business] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all businesses");
    };
    businesses.values().toArray().sort();
  };

  public shared ({ caller }) func updateSubscription(
    businessId : Nat,
    newStatus : SubscriptionStatus,
  ) : async () {
    let owner = requireOwner(caller, businessId);

    switch (businesses.get(businessId)) {
      case (null) { Runtime.trap("Business does not exist") };
      case (?business) {
        let updatedBusiness = {
          business with subscriptionStatus = newStatus;
        };
        businesses.add(businessId, updatedBusiness);
      };
    };
  };

  // =========================
  // Salesman Invite Management
  // =========================

  public shared ({ caller }) func inviteSalesman(
    businessId : Nat,
    contactInfo : Text,
  ) : async Nat {
    let owner = requireOwner(caller, businessId);

    if (contactInfo == "") {
      Runtime.trap("Contact info cannot be empty");
    };

    let inviteId = nextInviteId;
    let invite : SalesmanInvite = {
      id = inviteId;
      contactInfo;
      businessId;
      status = #pending;
      invitedAt = Time.now();
    };

    invites.add(inviteId, invite);
    nextInviteId += 1;
    inviteId;
  };

  public shared ({ caller }) func revokeInvite(inviteId : Nat) : async () {
    switch (invites.get(inviteId)) {
      case (null) { Runtime.trap("Invite does not exist") };
      case (?invite) {
        let owner = requireOwner(caller, invite.businessId);

        let updatedInvite = {
          invite with status = #revoked;
        };
        invites.add(inviteId, updatedInvite);
      };
    };
  };

  public shared ({ caller }) func deactivateSalesman(salesmanUserId : Nat) : async () {
    switch (users.get(salesmanUserId)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?salesman) {
        let owner = requireOwner(caller, salesman.businessId);

        if (salesman.role != #salesman) {
          Runtime.trap("Can only deactivate salesmen");
        };

        let updatedSalesman = {
          salesman with isActive = false;
        };
        users.add(salesmanUserId, updatedSalesman);
      };
    };
  };

  public query ({ caller }) func getInvitesForBusiness(businessId : Nat) : async [SalesmanInvite] {
    let owner = requireOwner(caller, businessId);

    invites.values().filter(
      func(invite : SalesmanInvite) : Bool {
        invite.businessId == businessId;
      }
    ).toArray();
  };

  // NEW: lookupInvite - no authorization check (for onboarding)
  public query ({ caller }) func lookupInvite(contactInfo : Text) : async ?SalesmanInvite {
    invites.values().find(
      func(invite : SalesmanInvite) : Bool {
        invite.contactInfo == contactInfo and invite.status == #pending;
      }
    );
  };

  // =========================
  // Product Management
  // =========================

  public shared ({ caller }) func addProduct(
    businessId : Nat,
    name : Text,
    sku : Text,
    category : Text,
    description : Text,
    imageUrls : [Storage.ExternalBlob],
    isActive : Bool,
  ) : async Nat {
    let owner = requireOwner(caller, businessId);

    if (name == "" or sku == "") {
      Runtime.trap("Product name and SKU cannot be empty");
    };

    let productId = nextProductId;
    let product : Product = {
      id = productId;
      businessId;
      name;
      sku;
      category;
      description;
      imageUrls;
      isActive;
    };

    productStore.add(productId, product);
    nextProductId += 1;
    productId;
  };

  public shared ({ caller }) func editProduct(
    productId : Nat,
    name : Text,
    sku : Text,
    category : Text,
    description : Text,
    imageUrls : [Storage.ExternalBlob],
    isActive : Bool,
  ) : async () {
    switch (productStore.get(productId)) {
      case (null) { Runtime.trap("Product does not exist") };
      case (?product) {
        let owner = requireOwner(caller, product.businessId);

        let updatedProduct = {
          product with
          name = name;
          sku = sku;
          category = category;
          description = description;
          imageUrls = imageUrls;
          isActive = isActive;
        };
        productStore.add(productId, updatedProduct);
      };
    };
  };

  public query ({ caller }) func getProductsForBusiness(businessId : Nat) : async [Product] {
    let user = requireBusinessMember(caller, businessId);

    productStore.values().filter(
      func(product : Product) : Bool {
        product.businessId == businessId;
      }
    ).toArray().sort(Comparison.compareProductsById);
  };

  public query ({ caller }) func getAllProducts() : async [Product] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all products");
    };
    productStore.values().toArray().sort(Comparison.compareProductsById);
  };

  // =========================
  // Product Variant Management
  // =========================

  public shared ({ caller }) func addProductVariant(
    productId : Nat,
    variantName : Text,
    stockCount : Nat,
    state : ProductState,
  ) : async Nat {
    switch (productStore.get(productId)) {
      case (null) { Runtime.trap("Product does not exist") };
      case (?product) {
        let owner = requireOwner(caller, product.businessId);

        let variantId = nextVariantId;
        let variant : ProductVariant = {
          id = variantId;
          productId;
          variantName;
          stockCount;
          state;
          lockedBy = null;
        };

        variants.add(variantId, variant);
        nextVariantId += 1;
        variantId;
      };
    };
  };

  public shared ({ caller }) func editProductVariant(
    variantId : Nat,
    variantName : Text,
    stockCount : Nat,
  ) : async () {
    switch (variants.get(variantId)) {
      case (null) { Runtime.trap("Variant does not exist") };
      case (?variant) {
        switch (productStore.get(variant.productId)) {
          case (null) { Runtime.trap("Product does not exist") };
          case (?product) {
            let owner = requireOwner(caller, product.businessId);

            let updatedVariant = {
              variant with
              variantName = variantName;
              stockCount = stockCount;
            };
            variants.add(variantId, updatedVariant);
          };
        };
      };
    };
  };

  public shared ({ caller }) func lockVariant(variantId : Nat) : async () {
    switch (variants.get(variantId)) {
      case (null) { Runtime.trap("Variant does not exist") };
      case (?variant) {
        switch (productStore.get(variant.productId)) {
          case (null) { Runtime.trap("Product does not exist") };
          case (?product) {
            let user = requireBusinessMember(caller, product.businessId);

            if (variant.state != #available) {
              Runtime.trap("Variant is not available for locking");
            };

            if (variant.stockCount < 1) {
              Runtime.trap("Variant is out of stock");
            };

            let updatedVariant = {
              variant with
              state = #locked;
              lockedBy = ?user.userId;
            };
            variants.add(variantId, updatedVariant);

            logActivity(user.userId, product.businessId, "lock_variant", "variantId: " # variantId.toText());
          };
        };
      };
    };
  };

  public shared ({ caller }) func releaseVariantLock(variantId : Nat) : async () {
    switch (variants.get(variantId)) {
      case (null) { Runtime.trap("Variant does not exist") };
      case (?variant) {
        switch (productStore.get(variant.productId)) {
          case (null) { Runtime.trap("Product does not exist") };
          case (?product) {
            let user = requireBusinessMember(caller, product.businessId);

            if (variant.state != #locked) {
              Runtime.trap("Variant is not locked");
            };

            // Only the user who locked it or owner can release
            switch (variant.lockedBy) {
              case (null) { Runtime.trap("Variant lock owner not found") };
              case (?lockerId) {
                if (lockerId != user.userId and user.role != #owner) {
                  Runtime.trap("Unauthorized: Only the locker or owner can release this lock");
                };
              };
            };

            let updatedVariant = {
              variant with
              state = #available;
              lockedBy = null;
            };
            variants.add(variantId, updatedVariant);

            logActivity(user.userId, product.businessId, "release_variant", "variantId: " # variantId.toText());
          };
        };
      };
    };
  };

  public query ({ caller }) func getVariantsForProduct(productId : Nat) : async [ProductVariant] {
    switch (productStore.get(productId)) {
      case (null) { Runtime.trap("Product does not exist") };
      case (?product) {
        let user = requireBusinessMember(caller, product.businessId);

        variants.values().filter(
          func(variant : ProductVariant) : Bool {
            variant.productId == productId;
          }
        ).toArray().sort(Comparison.compareVariantsById);
      };
    };
  };

  public query ({ caller }) func getAllProductVariants() : async [ProductVariant] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all variants");
    };
    variants.values().toArray().sort(Comparison.compareVariantsById);
  };

  // =========================
  // Bill Management
  // =========================

  public shared ({ caller }) func createBillToken(
    businessId : Nat,
    items : [BillItem],
    totalAmount : Nat,
  ) : async Nat {
    let user = requireBusinessMember(caller, businessId);

    if (items.size() == 0) {
      Runtime.trap("Bill must have at least one item");
    };

    // Verify all variants belong to this business and are locked by this user
    for (item in items.values()) {
      switch (variants.get(item.variantId)) {
        case (null) { Runtime.trap("Variant does not exist") };
        case (?variant) {
          switch (productStore.get(variant.productId)) {
            case (null) { Runtime.trap("Product does not exist") };
            case (?product) {
              if (product.businessId != businessId) {
                Runtime.trap("Variant does not belong to this business");
              };
            };
          };

          if (variant.state != #locked) {
            Runtime.trap("All variants must be locked before creating bill");
          };

          switch (variant.lockedBy) {
            case (null) { Runtime.trap("Variant lock owner not found") };
            case (?lockerId) {
              if (lockerId != user.userId) {
                Runtime.trap("All variants must be locked by the bill creator");
              };
            };
          };
        };
      };
    };

    let billId = nextBillId;
    let bill : BillToken = {
      id = billId;
      businessId;
      salesmanId = user.userId;
      items;
      status = #pending;
      createdAt = Time.now();
      finalizedAt = null;
      totalAmount;
    };

    bills.add(billId, bill);
    nextBillId += 1;

    logActivity(user.userId, businessId, "create_bill", "billId: " # billId.toText());

    billId;
  };

  public shared ({ caller }) func finalizeBill(billId : Nat) : async () {
    switch (bills.get(billId)) {
      case (null) { Runtime.trap("Bill does not exist") };
      case (?bill) {
        let owner = requireOwner(caller, bill.businessId);

        if (bill.status != #pending) {
          Runtime.trap("Bill is not pending");
        };

        // Mark variants as sold and deduct stock
        for (item in bill.items.values()) {
          switch (variants.get(item.variantId)) {
            case (null) { Runtime.trap("Variant does not exist") };
            case (?variant) {
              if (variant.stockCount < item.quantity) {
                Runtime.trap("Insufficient stock for variant");
              };

              let updatedVariant = {
                variant with
                state = #sold;
                stockCount = variant.stockCount - item.quantity : Nat;
                lockedBy = null;
              };
              variants.add(item.variantId, updatedVariant);
            };
          };
        };

        let updatedBill = {
          bill with
          status = #finalized;
          finalizedAt = ?Time.now();
        };
        bills.add(billId, updatedBill);

        logActivity(owner.userId, bill.businessId, "finalize_bill", "billId: " # billId.toText());
      };
    };
  };

  public shared ({ caller }) func cancelBill(billId : Nat) : async () {
    switch (bills.get(billId)) {
      case (null) { Runtime.trap("Bill does not exist") };
      case (?bill) {
        let owner = requireOwner(caller, bill.businessId);

        if (bill.status != #pending) {
          Runtime.trap("Bill is not pending");
        };

        // Release all locked variants
        for (item in bill.items.values()) {
          switch (variants.get(item.variantId)) {
            case (null) { Runtime.trap("Variant does not exist") };
            case (?variant) {
              let updatedVariant = {
                variant with
                state = #available;
                lockedBy = null;
              };
              variants.add(item.variantId, updatedVariant);
            };
          };
        };

        let updatedBill = {
          bill with
          status = #cancelled;
        };
        bills.add(billId, updatedBill);

        logActivity(owner.userId, bill.businessId, "cancel_bill", "billId: " # billId.toText());
      };
    };
  };

  public query ({ caller }) func getBillsForBusiness(businessId : Nat) : async [BillToken] {
    let user = requireBusinessMember(caller, businessId);

    bills.values().filter(
      func(bill : BillToken) : Bool {
        bill.businessId == businessId;
      }
    ).toArray().sort(Comparison.compareBillsById);
  };

  public query ({ caller }) func getPendingBills(businessId : Nat) : async [BillToken] {
    let user = requireBusinessMember(caller, businessId);

    bills.values().filter(
      func(bill : BillToken) : Bool {
        bill.businessId == businessId and bill.status == #pending;
      }
    ).toArray().sort(Comparison.compareBillsById);
  };

  public query ({ caller }) func getAllBills() : async [BillToken] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all bills");
    };
    bills.values().toArray().sort(Comparison.compareBillsById);
  };

  // =========================
  // Activity Logs
  // =========================

  public query ({ caller }) func getActivityLogs(businessId : Nat) : async [SalesmanActivityLog] {
    let owner = requireOwner(caller, businessId);

    activityLogs.values().filter(
      func(log : SalesmanActivityLog) : Bool {
        log.businessId == businessId;
      }
    ).toArray();
  };

  public query ({ caller }) func getSalesmanActivityLogs(salesmanUserId : Nat) : async [SalesmanActivityLog] {
    switch (users.get(salesmanUserId)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?salesman) {
        let owner = requireOwner(caller, salesman.businessId);

        activityLogs.values().filter(
          func(log : SalesmanActivityLog) : Bool {
            log.salesmanId == salesmanUserId;
          }
        ).toArray();
      };
    };
  };

  // =========================
  // Analytics
  // =========================

  public query ({ caller }) func getTotalSales(businessId : Nat) : async Nat {
    let owner = requireOwner(caller, businessId);

    var total = 0;
    for (bill in bills.values()) {
      if (bill.businessId == businessId and bill.status == #finalized) {
        total += bill.totalAmount;
      };
    };
    total;
  };

  public query ({ caller }) func getTotalBillsCount(businessId : Nat) : async Nat {
    let owner = requireOwner(caller, businessId);

    var count = 0;
    for (bill in bills.values()) {
      if (bill.businessId == businessId and bill.status == #finalized) {
        count += 1;
      };
    };
    count;
  };

  // =========================
  // Helper functions
  // =========================

  public query ({ caller }) func getTimeDiff(time1 : Time.Time, time2 : Time.Time) : async Int {
    time1 - time2;
  };

  // =========================
  // External Blob Operations
  // =========================

  func validateBlob(blob : Storage.ExternalBlob) {
    ();
  };

  // Blob storage
  include MixinStorage();
};
