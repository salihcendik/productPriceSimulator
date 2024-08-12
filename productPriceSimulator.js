import { LightningElement, api, wire } from 'lwc';
//APEX
import getProductDetails from '@salesforce/apex/ProductPriceSimulatorController.getProductDetailsByProductId';
import getAccountDetails from '@salesforce/apex/ProductPriceSimulatorController.getAccountDetailsByAccountId';
import getPrices from '@salesforce/apex/ProductPriceSimulatorController.getPricesByOrderSimulation';
//LWC
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import userId from '@salesforce/user/Id';
import ProfileName from '@salesforce/schema/User.Profile.Name';
import UserCompany from '@salesforce/schema/User.Company__c';
//LABELS
import lblDistributionChannel from '@salesforce/label/c.Distribution_Channel';
import lblSalesOrg from '@salesforce/label/c.Sales_Org';
import lblQuantity from '@salesforce/label/c.Quantity';
import lblUnit from '@salesforce/label/c.Unit';
import lblCurrency from '@salesforce/label/c.Currency';
import lblProducts from '@salesforce/label/c.Product_List';
import lblAccounts from '@salesforce/label/c.Account';
import lblDivision from '@salesforce/label/c.Division';
import lblGrossPrice from '@salesforce/label/c.Gross_Price';
import lblDiscount from '@salesforce/label/c.Discount';
import lblNetPrice from '@salesforce/label/c.Net_Price';
import lblButtonGetPrices from '@salesforce/label/c.Button_GetPrices';
import lblHeaderProductPriceSimulator from '@salesforce/label/c.Header_Product_Price_Simulator';
import lblSimulationSuccessMessage from '@salesforce/label/c.SimulationSuccessMessage';
import lblNoRecordsFound from '@salesforce/label/c.No_Records_Found';

export default class ProductPriceSimulator extends LightningElement {
    label = {
        lblDistributionChannel,
        lblSalesOrg,
        lblQuantity,
        lblUnit,
        lblCurrency,
        lblProducts,
        lblAccounts,
        lblDivision,
        lblGrossPrice,
        lblDiscount,
        lblNetPrice,
        lblButtonGetPrices,
        lblHeaderProductPriceSimulator,
        lblSimulationSuccessMessage,
        lblNoRecordsFound
    }
    accountFilter = { criteria: [{ fieldPath: 'OwnerId', operator: 'ne', value: null }] };
    productFilter = { criteria: [{ fieldPath: 'Company__c', operator: 'ne', value: null }] };
    productDisplayInfo = {
        additionalFields: ['ProductCode'],
    };
    productMatchingInfo = {
        primaryField: { fieldPath: 'Name' },
        additionalFields: [{ fieldPath: 'ProductCode' }],
    };
    currencyCodeOptions = [
        { label: 'EUR', value: 'EUR' },
        { label: 'USD', value: 'USD' },
        { label: 'TRY', value: 'TRY' },
        { label: 'RUB', value: 'RUB' },
        { label: 'GBP', value: 'GBP' }];
    showSpinner = false;
    @api recordId;
    @api currentSObjectName;
    selectedProductId;
    selectedAccountId;
    unitOptions = [];
    salesOrgOptions = [];
    distChannelOptions = [];
    divisonMap = new Map();
    defaultUnitValue;
    defaultSalesOrg;
    defaultDistChannel;
    defaultCurrencyCode = 'EUR';
    firstProductSalesOrgRecord;
    firstAccountSalesOrgRecord;
    assignedDivision;
    assignedDivisionLabel;
    productCode;
    pricesBySimulation;
    simulationAlertMessage = '';

    connectedCallback() {
        if (this.currentSObjectName == 'Product2') {
            this.selectedProductId = this.recordId;
        } else if (this.currentSObjectName == 'Account') {
            this.selectedAccountId = this.recordId;
        }
    }

    @wire(getRecord, { recordId: userId, fields: [ProfileName, UserCompany] })
    userDetails({ error, data }) {
        if (data) {
            if (data.fields.Profile.value != null) {
                const userProfileName = data.fields.Profile.value.fields.Name.value;
                const userCompany = data.fields.Company__c.value;
                console.log('UserProfileName: ', userProfileName, '/Company: ', userCompany);
                this.setAccountFilter(userProfileName);
                this.setProductFilter(userProfileName, userCompany);
            }
        }
        else if (error) {
            console.log('userDetails error', error);
        }
    }
    setAccountFilter(profileName) {
        if (profileName.startsWith('Sales Team')) {
            const filter = { criteria: [{ fieldPath: 'OwnerId', operator: 'eq', value: userId }] };
            this.accountFilter = filter;
        }
    }
    setProductFilter(profileName, userCompany) {
        if (profileName != 'System Administrator') {
            const filter = { criteria: [{ fieldPath: 'Company__c', operator: 'eq', value: userCompany }] };
            this.productFilter = filter;
        }
    }
    accountChangeHandler(event) {
        this.selectedAccountId = event.detail.recordId;
    }
    productChangeHandler(event) {
        this.selectedProductId = event.detail.recordId;
    }

    @wire(getAccountDetails, { accountId: '$selectedAccountId' })
    wiredAccountData({ error, data }) {
        if (data) {
            console.log('getAccountDetails', data);
            let uniqueValues = new Set();
            let salesOrgOptions = [];
            let distChannelOptions = [];
            data?.Account_Sales_Org__r?.forEach(item => {
                if (!uniqueValues.has(item.SalesOrg__c)) {
                    uniqueValues.add(item.SalesOrg__c);
                    salesOrgOptions.push({ label: item.salesOrgLabel, value: item.SalesOrg__c });
                }
                if (!uniqueValues.has(item.DistributionChannel__c)) {
                    uniqueValues.add(item.DistributionChannel__c);
                    distChannelOptions.push({ label: item.distChannelLabel, value: item.DistributionChannel__c });
                }
            });
            this.salesOrgOptions = salesOrgOptions;
            this.defaultSalesOrg = salesOrgOptions[0]?.value;
            this.distChannelOptions = distChannelOptions;
            this.defaultDistChannel = distChannelOptions[0]?.value;
            this.firstAccountSalesOrgRecord = data?.Account_Sales_Org__r[0];
        } else if (error) {
            console.log('getAccountDetails Error:', error);
        }
    }

    @wire(getProductDetails, { productId: '$selectedProductId' })
    wiredProductData({ error, data }) {
        if (data) {
            console.log('getProductDetails', data);
            let unitOptions = data?.Product_Convertion__r.map(item => ({ label: item.unitLabel, value: item.Unit__c }));
            this.unitOptions = unitOptions;
            this.defaultUnitValue = unitOptions?.some(item => item.value === 'PAL') ? 'PAL' : unitOptions && unitOptions[0].value;
            this.productCode = data?.ProductCode;
            this.firstProductSalesOrgRecord = data?.Product_Sales_Org__r[0];
        } else if (error) {
            console.log('getProductDetails Error:', error);
        }
    }
    getPricesBtnClickHandler(event) {
        this.assignDivision();
        if (!this.formValidator()) return;

        const quote = this.generateQuote();
        const quoteProducts = this.generateQuoteProducts();
        this.showSpinner = true;
        getPrices({ quote, quoteProducts })
            .then(result => {
                console.log('Simuation Result', result);
                const simulationResponseKey = '10';
                this.pricesBySimulation = result[simulationResponseKey];
                this.simulationAlertMessage = lblSimulationSuccessMessage;
                this.refs.alertMessage.classList.remove('slds-alert_error');
            })
            .catch(error => {
                console.log('Simuation Error:', error);
                this.pricesBySimulation = undefined;
                this.simulationAlertMessage = error.body.message;
                this.refs.alertMessage.classList.add('slds-alert_error');
            }).finally(() => {
                this.showSpinner = false;
                this.refs.alertMessage.style.display = "block";
            });
    }
    generateQuote() {
        const quote = {
            Orderer__c: this.selectedAccountId,
            CurrencyIsoCode: this.refs.selectedCurrencyCode.value,
            Company__c: this.firstAccountSalesOrgRecord.CompanyPicklist__c,
            Distribution_Channel__c: this.refs.selectedDistChannel.value,
            Division__c: this.assignedDivision,
            Order_Type__c: this.getOrderType(),
            Sales_Org__c: this.refs.selectedSalesOrg.value,
            Incoterm__c: this.firstAccountSalesOrgRecord.Incoterm__c
        };
        return quote;
    }
    generateQuoteProducts() {
        const quoteProducts = [];
        const quoteProduct = {
            ProductCode__c: this.productCode,
            Quantity_Unit__c: this.refs.selectedUnit.value,
            Quantity: this.refs.selectedQty.value,
        };
        quoteProducts.push(quoteProduct);
        return quoteProducts;
    }

    formValidator() {
        const isFieldsFilled = this.selectedAccountId &&
            this.selectedProductId &&
            this.refs.selectedSalesOrg.value &&
            this.refs.selectedDistChannel.value &&
            this.refs.selectedCurrencyCode.value &&
            this.refs.selectedUnit.value &&
            this.refs.selectedQty.value &&
            this.firstProductSalesOrgRecord &&
            this.firstAccountSalesOrgRecord;
        if (!isFieldsFilled) {
            this.showToast('Please enter all the fields.', '', 'error');
            return false;
        }
        return true;
    }
    getOrderType() {
        const company = this.firstAccountSalesOrgRecord.CompanyPicklist__c;
        let orderType;
        switch (company) {
            case "2400":
                orderType = 'Z003';
                break;
            case "2100":
                orderType = 'Z010'
                break;
            case "0001":
                orderType = 'ZLO';
                break;
            case "0092":
                orderType = 'YRSS';
                break;
            default:
                orderType = "No Found";
                break;
        }
        return orderType;
    }

    assignDivision() {
        if (this.refs.selectedSalesOrg.value == '2102' || this.refs.selectedSalesOrg.value == '2401') { //Export
            this.assignedDivision = this.firstAccountSalesOrgRecord?.Division__c;
            this.assignedDivisionLabel = this.firstAccountSalesOrgRecord?.divisionLabel;
        } else if (this.refs.selectedSalesOrg.value == '2101') {  //Domestic
            this.assignedDivision = this.firstProductSalesOrgRecord?.Division__c;
            this.assignedDivisionLabel = this.firstProductSalesOrgRecord?.divisionLabel;
        }
    }
    get disableAccountPicker() {
        return this.currentSObjectName == 'Account';
    }
    get disableProductPicker() {
        return this.currentSObjectName == 'Product2';
    }
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        }));
    }
}
