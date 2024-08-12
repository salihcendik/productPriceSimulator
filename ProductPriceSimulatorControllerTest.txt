@isTest
public with sharing class ProductPriceSimulatorControllerTest {
    @TestSetup
    static void makeData(){
        Id stateRecTypeId = Schema.sObjectType.Definition2__c.getRecordTypeInfosByDeveloperName().get('State').getRecordTypeId();
        Definition2__c state = new Definition2__c(RecordTypeId = stateRecTypeId, Name = 'Test State', Country__c = 'TR');
        insert state;

    
        Id districtRecTypeId = Schema.sObjectType.Definition2__c.getRecordTypeInfosByDeveloperName().get('District').getRecordTypeId();
        Definition2__c district = new Definition2__c(RecordTypeId = districtRecTypeId, Name = 'Test Disrict', State__c=state.Id);
        insert district;
        
        
        Id accountRecTypeId = Schema.sObjectType.Account.getRecordTypeInfosByDeveloperName().get('TR_Project').getRecordTypeId();
        Account acc = new Account(
            RecordTypeId = accountRecTypeId,
            Name = 'Test Account',
            Country__c = 'TR',
            State__c = state.Id,
            District__c = district.Id,
            TaxNumber__c = '0123456789',
            SAPNumber__c = 'SapNumber',
            Status__c = 'Active',
            Company__c = '2100'
        );
        insert acc;
        
        Id accountSDRecTypeId = Schema.sObjectType.Account_Sales_Org__c.getRecordTypeInfosByDeveloperName().get('TR_Sales_Org').getRecordTypeId();
        Account_Sales_Org__c accountSalesOrg = new Account_Sales_Org__c(
            RecordTypeId = accountSDRecTypeId,
            SalesOrg__c = '2101',
            DistributionChannel__c = '20',
            Division__c = '10',
            Account__c = acc.Id,
            CustomerPricingPresedure__c = '1',
            CompanyPicklist__c = '2100',
            Tax_Class__c = '0',
            Customer_Segment__c = 'A',
            Responsible__c = UserInfo.getUserId()
        );
        insert accountSalesOrg;

        ContactPointAddress contactPointAddress = new ContactPointAddress(
            ParentId = acc.Id,
            Name = 'TR Invoice Address',
            AddressType = 'Billing',
            Active__c = true,
            SAPNumber__c = 'SapNumber'
        );
        insert contactPointAddress;

        Product2 product = new Product2(
            Name = 'Test',
            ProductCode = '100',
            BaseUnitOfMeasure__c = 'ST',
            IsActive = true,
            ProductHierarchy__c = '123'
        );
        insert product;

        ProductConvertion__c prodCon = new ProductConvertion__c(
            Product__c = product.Id,
            Quantity__c = 1,
            Unit__c = 'ST',
            ConversionRate__c = 1
        );
        insert prodCon;

        Id productSDRecTypeId = Schema.sObjectType.Product_Sales_Org__c.getRecordTypeInfosByDeveloperName().get('Product_Sales_Org_TR').getRecordTypeId();
        Product_Sales_Org__c productSalesOrg = new Product_Sales_Org__c(
            RecordTypeId = productSDRecTypeId,
            Product__c = product.Id,
            SalesOrg__c = '2101',
            DistributionChannel__c = '20',
            I4SalesBlocking__c = false,
            Division__c = '10',
            Sales_Unit__c = 'ST',
            Segment__c = '1',
            Unit_of_measure_of_delivery_unit__c = 'CS',
            Minimum_Delivery_Quantity__c = 0.1
        );
        insert productSalesOrg;
    }

    @isTest
    static void getProductDetailsTest(){
        Product2 product = [SELECT Id FROM Product2 LIMIT 1];
        Product2 result = ProductPriceSimulatorController.getProductDetailsByProductId(product.Id);
        Assert.isNotNull(result);
    }

    @isTest
    static void getProductDetails_NegativeTest(){
        try{
            Product2 result = ProductPriceSimulatorController.getProductDetailsByProductId(null);
            Assert.fail(); 
        }catch(Exception e){
            Assert.areEqual('List has no rows for assignment to SObject', e.getMessage());
        }
    }

    @isTest
    static void getAccountDetailsTest(){
        Account account = [SELECT Id FROM Account LIMIT 1];
        Account result = ProductPriceSimulatorController.getAccountDetailsByAccountId(account.Id);
        Assert.isNotNull(result);
    }

    @isTest
    static void getAccountDetails_NegativeTest(){
        try{
            Account result = ProductPriceSimulatorController.getAccountDetailsByAccountId(null);
            Assert.fail(); 
        }catch(Exception e){
            Assert.areEqual('List has no rows for assignment to SObject', e.getMessage());
        }
    }

    @isTest
    static void getPricesByOrderSimulationTest(){
        Account account = [SELECT SAPNumber__c FROM Account LIMIT 1];
        Product2 product = [SELECT Id, ProductCode FROM Product2 LIMIT 1];
        Quote quoteObj = new Quote();
        quoteObj.CurrencyIsoCode = 'TRY';
        quoteObj.Company__c = '2100';
        quoteObj.Distribution_Channel__c = '20';
        quoteObj.Orderer__c = account.Id;
        quoteObj.Division__c = '10';
        quoteObj.Order_Type__c = 'Z010';
        quoteObj.Sales_Org__c = '2101';
        quoteObj.Incoterm__c = 'CIF';
        QuoteLineItem quoteProduct = new QuoteLineItem(ProductCode__c = product.ProductCode, Quantity_Unit__c = 'M2', Quantity = 1.44);
        Test.setMock(WebServiceMock.class, new OrderTriggerMock());
        Map<String, OrderSimulationServiceModal> result = ProductPriceSimulatorController.getPricesByOrderSimulation(quoteObj, new List<QuoteLineItem>{quoteProduct});
        Assert.isNotNull(result.get('10'));
    }
}
