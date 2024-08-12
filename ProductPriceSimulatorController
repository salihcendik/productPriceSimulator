public class ProductPriceSimulatorController {
    @AuraEnabled(cacheable=true)
    public static Product2 getProductDetailsByProductId(String productId){
        try{
            return [SELECT Company__c, ProductCode, (SELECT Division__c, toLabel(Division__c) divisionLabel FROM Product_Sales_Org__r WHERE Division__c <> null LIMIT 1), (SELECT Unit__c, toLabel(Unit__c) unitLabel FROM Product_Convertion__r WHERE Unit__c <> null) FROM Product2 WHERE Id = :productId];
        }catch(Exception e){
            throw new AuraException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Account getAccountDetailsByAccountId(String accountId){
        try{
            return [SELECT SAPNumber__c, (SELECT SalesOrg__c, toLabel(SalesOrg__c) salesOrgLabel, DistributionChannel__c, toLabel(DistributionChannel__c) distChannelLabel, Incoterm__c, CompanyPicklist__c, Division__c, toLabel(Division__c) divisionLabel FROM Account_Sales_Org__r) FROM Account WHERE Id = :accountId];
        }catch(Exception e){
            throw new AuraException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, OrderSimulationServiceModal> getPricesByOrderSimulation(Quote quote, List<QuoteLineItem> quoteProducts){  
        try{
            Account orderer = [SELECT SAPNumber__c FROM Account WHERE Id = :quote.Orderer__c LIMIT 1];
            quote.Orderer__r = orderer;
            quote.Shipping_Address__r = new ContactPointAddress(SAPNumber__c = orderer.SAPNumber__c);
            return SAPService.getPricesFromOrderSimulation2(quote.Company__c, quote, quoteProducts);
        }catch(Exception e){
            throw new AuraException(e.getMessage());
        }
    }
}
