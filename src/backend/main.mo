// CONTAINS CANISTER SPECIFIC TYPES AND FILTER FOR EXTENSION PATTERN
import Text "mo:core/Text";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Migration "migration";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

// Apply migration on upgrade
(with migration = Migration.run)
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
    basePrice : Nat;
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
    price : Nat;
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

  // =========================
  // Persistent State
  // =========================

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

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

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
    // Ensure caller has at least user permission in AccessControl
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can perform this action");
    };

    switch (getUserByPrincipal(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?user) {
        if (not user.isActive) {
          Runtime.trap("User is not active");
        };
        user;
      };
    };
  };

  func requireOwner(caller : Principal, businessId : Nat) : UserProfile {
    let user = requireUser(caller);
    if (user.businessId != businessId) {
      Runtime.trap("User does not belong to this business");
    };
    switch (user.role) {
      case (#owner) { user };
      case (_) { Runtime.trap("Only business owner can perform this action") };
    };
  };

  func requireBusinessMember(caller : Principal, businessId : Nat) : UserProfile {
    let user = requireUser(caller);
    if (user.businessId != businessId) {
      Runtime.trap("User does not belong to this business");
    };
    user;
  };

  func requireSalesman(caller : Principal, businessId : Nat) : UserProfile {
    let user = requireUser(caller);
    if (user.businessId != businessId) {
      Runtime.trap("User does not belong to this business");
    };
    switch (user.role) {
      case (#salesman) { user };
      case (_) { Runtime.trap("Only salesman can perform this action") };
    };
  };

  func logActivity(salesmanId : Nat, businessId : Nat, action : Text, metadata : Text) {
    let log : SalesmanActivityLog = {
      logId = nextLogId;
      salesmanId = salesmanId;
      businessId = businessId;
      action = action;
      timestamp = Time.now();
      metadata = metadata;
    };
    activityLogs.add(nextLogId, log);
    nextLogId += 1;
  };

  // =========================
  // User Profile Functions
  // =========================

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    getUserByPrincipal(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(
    name : Text,
    email : Text,
    phone : Text,
    businessId : Nat,
    role : Role,
    isActive : Bool,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Verify business exists
    let business = switch (businesses.get(businessId)) {
      case (null) { Runtime.trap("Business not found") };
      case (?b) { b };
    };

    // Authorization check based on role
    switch (role) {
      case (#owner) {
        if (business.owner != caller) {
          Runtime.trap("Only the business owner can register as owner");
        };
      };
      case (#salesman) {
        // Find matching invite
        var foundInvite : ?SalesmanInvite = null;
        for ((id, invite) in invites.entries()) {
          if (
            invite.businessId == businessId and invite.status == #pending and (invite.contactInfo == email or invite.contactInfo == phone)
          ) {
            foundInvite := ?invite;
          };
        };

        switch (foundInvite) {
          case (null) {
            Runtime.trap("No valid invite found for this salesman");
          };
          case (?invite) {
            // Mark invite as accepted
            let updatedInvite = {
              id = invite.id;
              contactInfo = invite.contactInfo;
              businessId = invite.businessId;
              status = #accepted;
              invitedAt = invite.invitedAt;
            };
            invites.add(invite.id, updatedInvite);
          };
        };
      };
    };

    // Create user profile
    let profile : UserProfile = {
      userId = nextUserId;
      principal = caller;
      name = name;
      email = email;
      phone = phone;
      businessId = businessId;
      role = role;
      isActive = isActive;
    };

    users.add(nextUserId, profile);
    principalToUserId.add(caller, nextUserId);
    nextUserId += 1;
  };

  public query ({ caller }) func getUserById(userId : Nat) : async ?UserProfile {
    // Require authenticated user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view user profiles");
    };

    let callerUserOpt = getUserByPrincipal(caller);
    let targetUserOpt = users.get(userId);

    switch (callerUserOpt, targetUserOpt) {
      case (null, _) { null };
      case (_, null) { null };
      case (?callerUser, ?targetUser) {
        // Can only view users in same business
        if (callerUser.businessId != targetUser.businessId) {
          return null;
        };
        ?targetUser;
      };
    };
  };

  public query ({ caller }) func getUserProfile(userPrincipal : Principal) : async ?UserProfile {
    // Admin bypass
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return getUserByPrincipal(userPrincipal);
    };

    // Require at least user permission
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };

    // Self-access allowed
    if (caller == userPrincipal) {
      return getUserByPrincipal(userPrincipal);
    };

    // Owner can view users in their business
    let callerUserOpt = getUserByPrincipal(caller);
    let targetUserOpt = getUserByPrincipal(userPrincipal);

    switch (callerUserOpt, targetUserOpt) {
      case (?callerUser, ?targetUser) {
        if (callerUser.role == #owner and callerUser.businessId == targetUser.businessId) {
          return ?targetUser;
        };
        Runtime.trap("Unauthorized: Can only view profiles in your business");
      };
      case (_, _) {
        Runtime.trap("Unauthorized: Can only view your own profile");
      };
    };
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

    if (name == "") {
      Runtime.trap("Business name cannot be empty");
    };

    if (trialEndDate <= trialStartDate) {
      Runtime.trap("Trial end date must be after start date");
    };

    // Check if caller already owns a business
    for ((id, business) in businesses.entries()) {
      if (business.owner == caller) {
        Runtime.trap("User already owns a business");
      };
    };

    let business : Business = {
      id = nextBusinessId;
      name = name;
      businessType = businessType;
      owner = caller;
      subscriptionStatus = subscriptionStatus;
      trialStartDate = trialStartDate;
      trialEndDate = trialEndDate;
    };

    businesses.add(nextBusinessId, business);
    let businessId = nextBusinessId;
    nextBusinessId += 1;
    businessId;
  };

  public query ({ caller }) func getBusiness(businessId : Nat) : async Business {
    let _ = requireBusinessMember(caller, businessId);

    switch (businesses.get(businessId)) {
      case (null) { Runtime.trap("Business not found") };
      case (?business) { business };
    };
  };

  public query ({ caller }) func getAllBusinesses() : async [Business] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all businesses");
    };

    let businessArray = businesses.values().toArray();
    businessArray.sort(Comparison.compareBusinessesById);
  };

  public shared ({ caller }) func updateSubscription(
    businessId : Nat,
    newStatus : SubscriptionStatus,
  ) : async () {
    let _ = requireOwner(caller, businessId);

    switch (businesses.get(businessId)) {
      case (null) { Runtime.trap("Business not found") };
      case (?business) {
        let updated = {
          id = business.id;
          name = business.name;
          businessType = business.businessType;
          owner = business.owner;
          subscriptionStatus = newStatus;
          trialStartDate = business.trialStartDate;
          trialEndDate = business.trialEndDate;
        };
        businesses.add(businessId, updated);
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
    let _ = requireOwner(caller, businessId);

    if (contactInfo == "") {
      Runtime.trap("Contact info cannot be empty");
    };

    let invite : SalesmanInvite = {
      id = nextInviteId;
      contactInfo = contactInfo;
      businessId = businessId;
      status = #pending;
      invitedAt = Time.now();
    };

    invites.add(nextInviteId, invite);
    let inviteId = nextInviteId;
    nextInviteId += 1;
    inviteId;
  };

  public shared ({ caller }) func revokeInvite(inviteId : Nat) : async () {
    let invite = switch (invites.get(inviteId)) {
      case (null) { Runtime.trap("Invite not found") };
      case (?inv) { inv };
    };

    let _ = requireOwner(caller, invite.businessId);

    let updated = {
      id = invite.id;
      contactInfo = invite.contactInfo;
      businessId = invite.businessId;
      status = #revoked;
      invitedAt = invite.invitedAt;
    };
    invites.add(inviteId, updated);
  };

  public shared ({ caller }) func deactivateSalesman(salesmanUserId : Nat) : async () {
    let user = switch (users.get(salesmanUserId)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) { u };
    };

    let _ = requireOwner(caller, user.businessId);

    switch (user.role) {
      case (#salesman) {
        let updated = {
          userId = user.userId;
          principal = user.principal;
          name = user.name;
          email = user.email;
          phone = user.phone;
          businessId = user.businessId;
          role = user.role;
          isActive = false;
        };
        users.add(salesmanUserId, updated);
      };
      case (_) {
        Runtime.trap("User is not a salesman");
      };
    };
  };

  public query ({ caller }) func getInvitesForBusiness(businessId : Nat) : async [SalesmanInvite] {
    let _ = requireOwner(caller, businessId);

    let inviteArray = invites.values().filter(
        func(inv : SalesmanInvite) : Bool {
          inv.businessId == businessId;
        },
      ).toArray();
    inviteArray;
  };

  public query func lookupInvite(contactInfo : Text) : async ?SalesmanInvite {
    // Public endpoint - no authorization required
    // This allows potential salesmen to check for invites before registering
    for ((id, invite) in invites.entries()) {
      if (invite.contactInfo == contactInfo and invite.status == #pending) {
        return ?invite;
      };
    };
    null;
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
    basePrice : Nat,
    imageUrls : [Storage.ExternalBlob],
    isActive : Bool,
  ) : async Nat {
    let _ = requireOwner(caller, businessId);

    if (name == "" or sku == "") {
      Runtime.trap("Product name and SKU cannot be empty");
    };

    let product : Product = {
      id = nextProductId;
      businessId = businessId;
      name = name;
      sku = sku;
      category = category;
      description = description;
      basePrice = basePrice;
      imageUrls = imageUrls;
      isActive = isActive;
    };

    productStore.add(nextProductId, product);
    let productId = nextProductId;
    nextProductId += 1;
    productId;
  };

  public shared ({ caller }) func editProduct(
    productId : Nat,
    name : Text,
    sku : Text,
    category : Text,
    description : Text,
    basePrice : Nat,
    imageUrls : [Storage.ExternalBlob],
    isActive : Bool,
  ) : async () {
    let product = switch (productStore.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let _ = requireOwner(caller, product.businessId);

    let updated = {
      id = product.id;
      businessId = product.businessId;
      name = name;
      sku = sku;
      category = category;
      description = description;
      basePrice = basePrice;
      imageUrls = imageUrls;
      isActive = isActive;
    };
    productStore.add(productId, updated);
  };

  public query ({ caller }) func getProductsForBusiness(businessId : Nat) : async [Product] {
    let _ = requireBusinessMember(caller, businessId);

    let productArray = productStore.values().filter(
        func(p : Product) : Bool {
          p.businessId == businessId;
        },
      ).toArray();
    productArray.sort(Comparison.compareProductsById);
  };

  public query ({ caller }) func getAllProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all products");
    };

    let productArray = productStore.values().toArray();
    productArray.sort(Comparison.compareProductsById);
  };

  // =========================
  // Product Variant Management
  // =========================

  public shared ({ caller }) func addProductVariant(
    productId : Nat,
    variantName : Text,
    price : Nat,
    stockCount : Nat,
    state : ProductState,
  ) : async Nat {
    let product = switch (productStore.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let _ = requireOwner(caller, product.businessId);

    let variant : ProductVariant = {
      id = nextVariantId;
      productId = productId;
      variantName = variantName;
      price = price;
      stockCount = stockCount;
      state = state;
      lockedBy = null;
    };

    variants.add(nextVariantId, variant);
    let variantId = nextVariantId;
    nextVariantId += 1;
    variantId;
  };

  public shared ({ caller }) func editProductVariant(
    variantId : Nat,
    variantName : Text,
    price : Nat,
    stockCount : Nat,
  ) : async () {
    let variant = switch (variants.get(variantId)) {
      case (null) { Runtime.trap("Variant not found") };
      case (?v) { v };
    };

    let product = switch (productStore.get(variant.productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let _ = requireOwner(caller, product.businessId);

    let updated = {
      id = variant.id;
      productId = variant.productId;
      variantName = variantName;
      price = price;
      stockCount = stockCount;
      state = variant.state;
      lockedBy = variant.lockedBy;
    };
    variants.add(variantId, updated);
  };

  public shared ({ caller }) func lockVariant(variantId : Nat) : async () {
    let variant = switch (variants.get(variantId)) {
      case (null) { Runtime.trap("Variant not found") };
      case (?v) { v };
    };

    let product = switch (productStore.get(variant.productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let user = requireBusinessMember(caller, product.businessId);

    switch (variant.state) {
      case (#available) {};
      case (_) {
        Runtime.trap("Variant is not available for locking");
      };
    };

    if (variant.stockCount < 1) {
      Runtime.trap("Variant is out of stock");
    };

    let updated = {
      id = variant.id;
      productId = variant.productId;
      variantName = variant.variantName;
      price = variant.price;
      stockCount = variant.stockCount;
      state = #locked;
      lockedBy = ?user.userId;
    };
    variants.add(variantId, updated);

    logActivity(user.userId, product.businessId, "lock_variant", variantId.toText());
  };

  public shared ({ caller }) func releaseVariantLock(variantId : Nat) : async () {
    let variant = switch (variants.get(variantId)) {
      case (null) { Runtime.trap("Variant not found") };
      case (?v) { v };
    };

    let product = switch (productStore.get(variant.productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let user = requireBusinessMember(caller, product.businessId);

    switch (variant.state) {
      case (#locked) {};
      case (_) {
        Runtime.trap("Variant is not locked");
      };
    };

    // Only locker or owner can release
    let canRelease = switch (variant.lockedBy) {
      case (?lockerId) {
        lockerId == user.userId or user.role == #owner;
      };
      case (null) { false };
    };

    if (not canRelease) {
      Runtime.trap("Only the locker or business owner can release this lock");
    };

    let updated = {
      id = variant.id;
      productId = variant.productId;
      variantName = variant.variantName;
      price = variant.price;
      stockCount = variant.stockCount;
      state = #available;
      lockedBy = null;
    };
    variants.add(variantId, updated);

    logActivity(user.userId, product.businessId, "release_variant", variantId.toText());
  };

  public query ({ caller }) func getVariantsForProduct(productId : Nat) : async [ProductVariant] {
    let product = switch (productStore.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let _ = requireBusinessMember(caller, product.businessId);

    let variantArray = variants.values().filter(
        func(v : ProductVariant) : Bool {
          v.productId == productId;
        },
      ).toArray();
    variantArray.sort(Comparison.compareVariantsById);
  };

  public query ({ caller }) func getAllProductVariants() : async [ProductVariant] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all variants");
    };

    let variantArray = variants.values().toArray();
    variantArray.sort(Comparison.compareVariantsById);
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

    // Validate all items
    for (item in items.vals()) {
      let variant = switch (variants.get(item.variantId)) {
        case (null) { Runtime.trap("Variant not found: " # item.variantId.toText()) };
        case (?v) { v };
      };

      let product = switch (productStore.get(variant.productId)) {
        case (null) { Runtime.trap("Product not found") };
        case (?p) { p };
      };

      if (product.businessId != businessId) {
        Runtime.trap("Variant does not belong to this business");
      };

      switch (variant.state) {
        case (#locked) {};
        case (_) {
          Runtime.trap("Variant must be locked before adding to bill");
        };
      };

      switch (variant.lockedBy) {
        case (?lockerId) {
          if (lockerId != user.userId) {
            Runtime.trap("Variant is locked by another user");
          };
        };
        case (null) {
          Runtime.trap("Variant is not locked");
        };
      };
    };

    let bill : BillToken = {
      id = nextBillId;
      businessId = businessId;
      salesmanId = user.userId;
      items = items;
      status = #pending;
      createdAt = Time.now();
      finalizedAt = null;
      totalAmount = totalAmount;
    };

    bills.add(nextBillId, bill);
    let billId = nextBillId;
    nextBillId += 1;

    logActivity(user.userId, businessId, "create_bill", billId.toText());
    billId;
  };

  public shared ({ caller }) func finalizeBill(billId : Nat) : async () {
    let bill = switch (bills.get(billId)) {
      case (null) { Runtime.trap("Bill not found") };
      case (?b) { b };
    };

    let user = requireOwner(caller, bill.businessId);

    switch (bill.status) {
      case (#pending) {};
      case (_) {
        Runtime.trap("Bill is not pending");
      };
    };

    // Process each item
    for (item in bill.items.vals()) {
      let variant = switch (variants.get(item.variantId)) {
        case (null) { Runtime.trap("Variant not found") };
        case (?v) { v };
      };

      if (variant.stockCount < item.quantity) {
        Runtime.trap("Insufficient stock for variant: " # item.variantId.toText());
      };

      let newStockCount = variant.stockCount - item.quantity;
      let newState = if (newStockCount == 0) { #sold } else { #available };

      let updated = {
        id = variant.id;
        productId = variant.productId;
        variantName = variant.variantName;
        price = variant.price;
        stockCount = newStockCount;
        state = newState;
        lockedBy = null;
      };
      variants.add(item.variantId, updated);
    };

    let updatedBill = {
      id = bill.id;
      businessId = bill.businessId;
      salesmanId = bill.salesmanId;
      items = bill.items;
      status = #finalized;
      createdAt = bill.createdAt;
      finalizedAt = ?Time.now();
      totalAmount = bill.totalAmount;
    };
    bills.add(billId, updatedBill);

    logActivity(user.userId, bill.businessId, "finalize_bill", billId.toText());
  };

  public shared ({ caller }) func cancelBill(billId : Nat) : async () {
    let bill = switch (bills.get(billId)) {
      case (null) { Runtime.trap("Bill not found") };
      case (?b) { b };
    };

    let user = requireOwner(caller, bill.businessId);

    switch (bill.status) {
      case (#pending) {};
      case (_) {
        Runtime.trap("Bill is not pending");
      };
    };

    // Release all locked variants
    for (item in bill.items.vals()) {
      let variant = switch (variants.get(item.variantId)) {
        case (null) { Runtime.trap("Variant not found") };
        case (?v) { v };
      };

      let updated = {
        id = variant.id;
        productId = variant.productId;
        variantName = variant.variantName;
        price = variant.price;
        stockCount = variant.stockCount;
        state = #available;
        lockedBy = null;
      };
      variants.add(item.variantId, updated);
    };

    let updatedBill = {
      id = bill.id;
      businessId = bill.businessId;
      salesmanId = bill.salesmanId;
      items = bill.items;
      status = #cancelled;
      createdAt = bill.createdAt;
      finalizedAt = bill.finalizedAt;
      totalAmount = bill.totalAmount;
    };
    bills.add(billId, updatedBill);

    logActivity(user.userId, bill.businessId, "cancel_bill", billId.toText());
  };

  public query ({ caller }) func getBillsForBusiness(businessId : Nat) : async [BillToken] {
    let _ = requireBusinessMember(caller, businessId);

    let billArray = bills.values().filter(
        func(b : BillToken) : Bool {
          b.businessId == businessId;
        },
      ).toArray();
    billArray.sort(Comparison.compareBillsById);
  };

  public query ({ caller }) func getPendingBills(businessId : Nat) : async [BillToken] {
    let _ = requireBusinessMember(caller, businessId);

    let billArray = bills.values().filter(
        func(b : BillToken) : Bool {
          b.businessId == businessId and b.status == #pending;
        },
      ).toArray();
    billArray.sort(Comparison.compareBillsById);
  };

  public query ({ caller }) func getAllBills() : async [BillToken] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all bills");
    };

    let billArray = bills.values().toArray();
    billArray.sort(Comparison.compareBillsById);
  };

  // =========================
  // Activity Logs
  // =========================

  public query ({ caller }) func getActivityLogs(businessId : Nat) : async [SalesmanActivityLog] {
    let _ = requireOwner(caller, businessId);

    activityLogs.values().filter(
        func(log : SalesmanActivityLog) : Bool {
          log.businessId == businessId;
        },
      ).toArray();
  };

  public query ({ caller }) func getSalesmanActivityLogs(salesmanUserId : Nat) : async [SalesmanActivityLog] {
    let user = switch (users.get(salesmanUserId)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) { u };
    };

    let _ = requireOwner(caller, user.businessId);

    activityLogs.values().filter(
        func(log : SalesmanActivityLog) : Bool {
          log.salesmanId == salesmanUserId;
        },
      ).toArray();
  };

  // =========================
  // Analytics
  // =========================

  public query ({ caller }) func getTotalSales(businessId : Nat) : async Nat {
    let _ = requireOwner(caller, businessId);

    var total : Nat = 0;
    for ((id, bill) in bills.entries()) {
      if (bill.businessId == businessId and bill.status == #finalized) {
        total += bill.totalAmount;
      };
    };
    total;
  };

  public query ({ caller }) func getTotalBillsCount(businessId : Nat) : async Nat {
    let _ = requireOwner(caller, businessId);

    var count : Nat = 0;
    for ((id, bill) in bills.entries()) {
      if (bill.businessId == businessId and bill.status == #finalized) {
        count += 1;
      };
    };
    count;
  };

  // =========================
  // Helper
  // =========================

  public query func getTimeDiff(time1 : Time.Time, time2 : Time.Time) : async Int {
    // Public utility function - no authorization required
    time1 - time2;
  };
};
