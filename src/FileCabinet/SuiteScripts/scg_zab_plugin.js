/**
 * This custom plugin is called during the ZAB Create Transaction Process.
 * Here are the Supported functions and when they trigger:
 *
 * 1. executePreTransactionCreation
 * 2. executePostTransactionCreation
 * 3. executePostChargesUpdated
 *
 * @NApiVersion 2.x
 * @NScriptType plugintypeimpl
 */
define([
    "N/record",
    "N/search",
    "N/plugin",
    "./Lib/lodash.min",
    "./Lib/_scg_zab_lib.js"
], function (record, search, plugin, _, ZAB_CONSTANTS) {
    /**
     * Plug-In Function that allows a custom process to be triggered
     * directly before the a transaction is created from a ZAB Subscription
     *
     * @param {Object} dataIn
     * @param {SubscriptionCharge[]} dataIn.subscriptionCharges - Array of all charges used for this transaction
     *
     * @returns {void}
     */
    function executePreTransactionCreation(dataIn) {
        try {
            log.debug({
                title: "executePreTransactionCreation: Start",
                details: Object.keys(dataIn.subscriptionCharges[0])
            });
            // _.forEach(dataIn.subscriptionCharges, function (c) {});
        } catch (e) {
            log.error({
                title: "executePreTransactionCreation: Error",
                details: e
            });
        }
    }

    /**
     * Plug-In Function that allows a custom process to be triggered
     * directly after the a transaction is created from a ZAB Subscription
     *
     * @param {Object} dataIn
     * @param {String} dataIn.transactionId - NetSuite Transaction ID
     * @param {Object} dataIn.lineCharges
     *** @key {Object} dataIn.lineCharges - The Line ID for the charges
     *** @value {SubscriptionCharge[]} dataIn.lineCharges - An array of Objects, resembling ZAB Charges, with information regarding
     *  teh charge corresponding to that line
     *
     * @returns {void}
     *
     */
    function executePostTransactionCreation(dataIn) {
        log.debug({
            title: "executePostTransactionCreation Executed",
            details: dataIn
        });

        try {
            log.debug({
                title: dataIn.transactionId,
                details: dataIn.lineCharges
            });
        } catch (e) {
            //end try
            log.error({
                title: "executePostTransactionCreation: error",
                details: e
            });
        } finally {
            //end catch
            log.debug({
                title: "executePostTransactionCreation Complete",
                details: dataIn
            });
        } //end finally
    } //post creation check

    /**
     * Plug-In Function that allows a custom process to be triggered
     * directly after the ZAB charges related to a specific subscription's transaction are updated.
     * Creates a CSV file or PDF attachment for usage detail reports
     *
     *
     *
     * @param {Object} dataIn
     * @param {String|null} dataIn.transactionId - The Transaction ID that was just created, if one was created
     * @param {String[]} dataIn.chargeIds - Array of Charge Ids that were just updated for the transaction.
     *
     * @returns {void}
     *
     */
    function executePostChargesUpdated(dataIn) {
        log.debug({
            title: "executePostChargesUpdated Executed",
            details: dataIn
        });

        try {
            if (dataIn.transactionId) {
                var tranType = ZAB_CONSTANTS.getTransactionType(
                    dataIn.transactionId
                );

                var tran = record.load({
                    type: tranType,
                    id: dataIn.transactionId
                });

                var usageNeed = tran.getValue({
                    fieldId:
                        ZAB_CONSTANTS.RECORD_TYPE.NS_TRANSACTION.Body_Field
                            .USAGE_NEED
                });
                var subsidiary = tran.getValue({
                    fieldId: "subsidiary"
                });
                log.debug({
                    title: "UsageType",
                    details: usageNeed
                });
                if (
                    usageNeed ===
                    ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.CALLMAX
                ) {
                    record.submitFields({
                        type: tranType,
                        id: dataIn.transactionId,
                        values: {
                            location: 205
                        }
                    });
                }
            }

            //Get  Charges in run
            if (dataIn.chargeIds.length && dataIn.transactionId && usageNeed) {
                //screenings
                if (
                    usageNeed ==
                        ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RHR ||
                    usageNeed ==
                        ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RESCHECK
                ) {
                    var screenCharges = getScreenCharges(dataIn);
                    if (screenCharges.length) {
                        log.debug({
                            title: "Logging Usage",
                            details: dataIn.transactionId
                        });
                        var usageString = createScreenUsageString(
                            screenCharges,
                            dataIn.transactionId
                        );
                        var fileId = screeningCSV(
                            screenCharges,
                            dataIn.transactionId,
                            usageNeed
                        );

                        log.debug({
                            title: "Update TranID: " + dataIn.transactionId,
                            details: usageString
                        });
                        if (usageString.length) {
                            /*
                                reset location on header of transactions
                                 */
                            if (
                                usageNeed ==
                                ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES
                                    .RESCHECK
                            ) {
                                record.attach({
                                    record: {
                                        type: "file",
                                        id: fileId
                                    },
                                    to: {
                                        type: tranType,
                                        id: dataIn.transactionId
                                    }
                                });
                                record.submitFields({
                                    type: tranType,
                                    id: dataIn.transactionId,
                                    values: {
                                        custbody_scg_stringify_usage:
                                            usageString,
                                        custbody_scg_usage_file_attach: fileId
                                    }
                                });
                            } else if (
                                usageNeed ==
                                ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RHR
                            ) {
                                if (subsidiary == 2) {
                                    if (tranType === record.Type.CREDIT_MEMO) {
                                        record.attach({
                                            record: {
                                                type: "file",
                                                id: fileId
                                            },
                                            to: {
                                                type: tranType,
                                                id: dataIn.transactionId
                                            }
                                        });
                                        record.submitFields({
                                            type: tranType,
                                            id: dataIn.transactionId,
                                            values: {
                                                custbody_scg_stringify_usage:
                                                    usageString,
                                                custbody_scg_usage_file_attach:
                                                    fileId,
                                                location: 5,
                                                custbody_scg_credit_reason: 8
                                            }
                                        });
                                    } else {
                                        record.attach({
                                            record: {
                                                type: "file",
                                                id: fileId
                                            },
                                            to: {
                                                type: tranType,
                                                id: dataIn.transactionId
                                            }
                                        });
                                        record.submitFields({
                                            type: tranType,
                                            id: dataIn.transactionId,
                                            values: {
                                                custbody_scg_stringify_usage:
                                                    usageString,
                                                custbody_scg_usage_file_attach:
                                                    fileId,
                                                location: 5
                                            }
                                        });
                                    }
                                } else if (subsidiary == 6) {
                                    record.attach({
                                        record: {
                                            type: "file",
                                            id: fileId
                                        },
                                        to: {
                                            type: tranType,
                                            id: dataIn.transactionId
                                        }
                                    });
                                    record.submitFields({
                                        type: tranType,
                                        id: dataIn.transactionId,
                                        values: {
                                            custbody_scg_stringify_usage:
                                                usageString,
                                            custbody_scg_usage_file_attach:
                                                fileId,
                                            location: 6
                                        }
                                    });
                                }
                            }
                        } else {
                            log.debug({
                                title: "Not screening",
                                details: dataIn.transactionId
                            });
                        }

                        //Insurance
                    }
                } else if (usageNeed == 3) {
                    var insuranceCharges = getInsuranceCharges(dataIn);
                    if (insuranceCharges.length) {
                        log.debug({
                            title: "Logging Insurance Usage",
                            details: dataIn.transactionId
                        });
                        var fileId = createUsageFile(dataIn, insuranceCharges);
                        if (fileId) {
                            record.attach({
                                record: {
                                    type: "file",
                                    id: fileId
                                },
                                to: {
                                    type: tranType,
                                    id: dataIn.transactionId
                                }
                            });

                            record.submitFields({
                                type: tranType,
                                id: dataIn.transactionId,
                                values: {
                                    custbody_scg_usage_file_attach: fileId
                                }
                            });
                        }
                    }
                }
            } //end if
        } catch (e) {
            //end try
            log.error({
                title: "executePostChargesUpdated: error",
                details: e
            });
        } finally {
            //end catch
            log.debug({
                title: "executePostChargesUpdated Complete",
                details: dataIn
            });
        } //end finally
    }

    /**
     * Functions
     *
     */
    /**
     *
     * @param dataIn
     * @returns {screenCharges[]}
     */
    function getScreenCharges(dataIn) {
        log.debug({
            title: "getScreenCharges: start",
            details: dataIn
        });
        var screenCharges = [];
        var filters = [];
        var columns = [];

        filters.push(
            search.createFilter({
                name: "internalid",
                operator: search.Operator.ANYOF,
                values: dataIn.chargeIds
            })
        );

        try {
            var chargeDataSearch;
            chargeDataSearch = search
                .create({
                    type: ZAB_CONSTANTS.RECORD_TYPE.ZAB_CHARGE.ID,
                    filters: filters,
                    columns: [
                        "internalid",
                        "custrecordzab_c_charge_period_start_date",
                        "custrecordzab_c_charge_period_end_date",
                        "custrecordzab_c_subscription_item",
                        "custrecordzab_c_transaction",
                        {
                            name: "custrecord_scg_pull_client_id",
                            join: "custrecordzab_c_subscription_item"
                        },
                        {
                            name: "custrecordzab_si_item",
                            join: "custrecordzab_c_subscription_item"
                        }
                    ]
                })
                .runPaged({ pageSize: 1000 });

            //Arrange results
            chargeDataSearch.pageRanges.forEach(function (pageRange) {
                chargeDataSearch
                    .fetch({ index: pageRange.index })
                    .data.forEach(function (result) {
                        /**
                         * Charge array
                         * @typedef {Object} ZABCharge
                         * @property {string} id
                         * @property {string} start_date
                         * @property {string} end_date
                         * @property {string} subscription_item
                         * @property {string} transaction_id
                         * @property {string} clientId
                         * @property {string} prod
                         */
                        screenCharges.push({
                            id: result.getValue({ name: "internalid" }),
                            start_date: result.getValue({
                                name: "custrecordzab_c_charge_period_start_date"
                            }),
                            end_date: result.getValue({
                                name: "custrecordzab_c_charge_period_end_date"
                            }),
                            subscription_item: result.getValue({
                                name: "custrecordzab_c_subscription_item"
                            }),
                            transaction_id: result.getValue({
                                name: "custrecordzab_c_transaction"
                            }),
                            clientId: result.getValue({
                                name: "custrecord_scg_pull_client_id",
                                join: "custrecordzab_c_subscription_item"
                            }),
                            prod: result.getValue({
                                name: "custrecordzab_si_item",
                                join: "custrecordzab_c_subscription_item"
                            })
                        }); //pushed
                    }); //end fetch
            }); //end pageRanges
        } catch (e) {
            //end try
            log.error({
                title: "Error: getScreenCharges",
                details: e
            });
        } //end catch

        log.debug({
            title: "getApplicableCharges: end",
            details: screenCharges
        });

        return screenCharges;
    } //end get charges

    /**
     *Creates CSV file of screening usage
     * Uses library for creating CSV
     *
     * @param screenCharges
     * @param tranId
     * @param usageNeed
     * @returns {string} fileId
     */
    function screeningCSV(screenCharges, tranId, usageNeed) {
        try {
            var filters = [];
            _.each(
                _.groupBy(screenCharges, "clientId"),
                function (scharges, clientId) {
                    //add OR filter logic if not the first run
                    if (filters.length > 0) {
                        filters.push("OR");
                    }
                    var dateFilters = [];

                    _.each(scharges, function (scharge) {
                        if (dateFilters.length > 0) {
                            dateFilters.push("OR");
                        }
                        dateFilters.push([
                            [
                                "custrecord_scg_main_date",
                                search.Operator.ONORAFTER,
                                scharge.start_date
                            ],
                            "AND",
                            [
                                "custrecord_scg_main_date",
                                search.Operator.ONORBEFORE,
                                scharge.end_date
                            ]
                        ]);
                    });
                    filters.push([
                        [
                            "custrecord_scg_client_id",
                            search.Operator.IS,
                            clientId
                        ],
                        "AND",
                        dateFilters
                    ]);
                } //end each function
            ); //end each

            var screenSearch;
            if (usageNeed === ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RHR) {
                screenSearch = search.load({
                    id: "customsearch_scg_file_of_screens"
                });
            } else {
                screenSearch = search.load({
                    id: "customsearch_scg_file_of_screens_2"
                });
            }
            var f = screenSearch.filters;
            //    for(var j; j < filters.length; j++){
            //      f.push(filters[j]);
            //};
            log.debug({
                title: "screeningCSV",
                details: filters
            });

            var screenSearchN = search.create({
                type: ZAB_CONSTANTS.RECORD_TYPE.MRI_SCREENING.ID,
                columns: screenSearch.columns,
                filters: filters
            });

            var fileId = ZAB_CONSTANTS.createCSVFile3(tranId, screenSearchN);
            // ZAB_CONSTANTS.createPDFScreening(tranId, screenSearchN);

            return fileId;
        } catch (e) {
            log.error({
                title: "Error Creating Screening File",
                details: e
            });
        }
    }

    /**
     * Creates String of Usage Details
     * No lib functions
     * @param {screenCharges[]} screenCharges
     *
     *
     * @param {String} tranId
     * @return {string} usageString
     */
    function createScreenUsageString(screenCharges, tranId) {
        try {
            log.debug({
                title: "setTransaction: start",
                details: screenCharges
            });

            //initialize screens
            //    var usageString = 'No screens found';

            if (screenCharges.length) {
                var columns = [];

                columns.push(
                    search.createColumn({
                        name: "internalid"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_client_id"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_prod"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_main_date"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_app_name"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord9"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord10"
                    })
                );

                var filters = [];
                _.each(
                    _.groupBy(screenCharges, "clientId"),
                    function (scharges, clientId) {
                        //add OR filter logic if not the first run
                        if (filters.length > 0) {
                            filters.push("OR");
                        }
                        var dateFilters = [];

                        _.each(scharges, function (scharge) {
                            if (dateFilters.length > 0) {
                                dateFilters.push("OR");
                            }
                            dateFilters.push([
                                [
                                    "custrecord_scg_main_date",
                                    search.Operator.ONORAFTER,
                                    scharge.start_date
                                ],
                                "AND",
                                [
                                    "custrecord_scg_main_date",
                                    search.Operator.ONORBEFORE,
                                    scharge.end_date
                                ]
                            ]);
                        });
                        filters.push([
                            [
                                "custrecord_scg_client_id",
                                search.Operator.IS,
                                clientId
                            ],
                            "AND",
                            dateFilters
                        ]);
                    } //end each function
                ); //end each
                log.debug({
                    title: "setTransaction: filters",
                    details: filters
                });

                const PAGED_DATA = search
                    .create({
                        type: "customrecord_scg_mri_screening",
                        columns: columns,
                        filters: filters
                    })
                    .runPaged({ pageSize: 1000 });

                var screens = [];
                log.debug({
                    title: "Transaction to tag",
                    details: tranId
                });
                var screenUsage = [];
                PAGED_DATA.pageRanges.forEach(function (pageRange) {
                    PAGED_DATA.fetch({ index: pageRange.index }).data.forEach(
                        function (result) {
                            var screenId = result.getValue(columns[0]);
                            log.debug({
                                title: "Screen to update",
                                details: screenId
                            });
                            //   var screen = record.load({
                            //      type: "customrecord_scg_mri_screening",
                            //    id: screenId,
                            //     isDynamic: true
                            //});
                            //removed 3/9
                            //screen.setValue({
                            //  fieldId: 'custrecord_scg_attach_screen',
                            //value: tranId
                            //});

                            //stringify
                            var appName = result.getValue(columns[4]);
                            var date = result.getValue(columns[5]);
                            var cost = result.getValue(columns[6]);

                            var description = String(
                                appName + "@" + date + "@" + cost
                            );
                            screenUsage.push(description);

                            //screen.save();
                            screens.push(screenId);
                        } //end submit field
                    );
                }); //end page run
            } //end if
            //Create Array String
            if (screenUsage.length) {
                var usageString = screenUsage.join("|");
            }
        } catch (e) {
            //end try
            log.error({
                title: "setTransaction: error",
                details: e
            });
        } finally {
            //end catch
            log.debug({
                title: "setTransaction: end",
                details: screens
            });
            return usageString;
        }
    } //end set transactions

    /**
     * @description Get all Charges related to insurance
     * @param dataIn
     * @param {string} dataIn.transactionId
     * @param {string[]} dataIn.chargeIds
     *
     * @returns {insuranceCharges[]}
     */
    function getInsuranceCharges(dataIn) {
        log.debug({
            title: "getInsuranceCharges: start",
            details: dataIn
        });
        var insuranceCharges = [];

        try {
            insuranceCharges = ZAB_CONSTANTS.chargeDataSearch(
                dataIn,
                insuranceCharges
            );

            return insuranceCharges;
        } catch (e) {
            log.error({
                title: "Error in getInsuranceCharges",
                details: e
            });
        }
    }

    /**
     *
     * @param dataIn
     * @param {string} dataIn.transactionId
     * @param {string[]} dataIn.chargeIds
     *
     * @param insuranceCharges
     * @returns {*|string|number|void}
     *
     */
    function createUsageFile(dataIn, insuranceCharges) {
        log.debug({
            title: "createUsageFile: Start",
            details: insuranceCharges
        });
        try {
            var filters = [];
            _.each(
                _.groupBy(insuranceCharges, "customer"),
                function (scharges, clientId) {
                    //add OR filter logic if not the first run
                    if (filters.length > 0) {
                        filters.push("OR");
                    }
                    var dateFilters = [];

                    _.each(scharges, function (scharge) {
                        if (dateFilters.length > 0) {
                            dateFilters.push("OR");
                        }
                        dateFilters.push([
                            [
                                ZAB_CONSTANTS.RECORD_TYPE.MRI_INSURANCE.Field
                                    .SERVICE_DATE,
                                search.Operator.ONORAFTER,
                                scharge.start_date
                            ],
                            "AND",
                            [
                                ZAB_CONSTANTS.RECORD_TYPE.MRI_INSURANCE.Field
                                    .SERVICE_DATE,
                                search.Operator.ONORBEFORE,
                                scharge.end_date
                            ]
                        ]);
                    });
                    filters.push([
                        [
                            ZAB_CONSTANTS.RECORD_TYPE.MRI_INSURANCE.Field
                                .CUSTOMER,
                            search.Operator.ANYOF,
                            clientId
                        ],
                        "AND",
                        dateFilters
                    ]);
                } //end each function
            ); //end each
            log.debug({
                title: "setTransaction: filters",
                details: filters
            });
            var iSearch = search.load({
                id: "customsearch_scg_for_file"
            });
            var f = iSearch.filters;
            for (var i; i < filters.length; i++) {
                f.push(filters[i]);
            }

            var newFile = ZAB_CONSTANTS.createCSVFile2(dataIn, iSearch);

            return newFile;
        } catch (e) {
            log.error({
                title: "Error in createUsageFIle",
                details: e
            });
        }
    }

    return {
        executePreTransactionCreation: executePreTransactionCreation,
        executePostTransactionCreation: executePostTransactionCreation,
        executePostChargesUpdated: executePostChargesUpdated
    };
});

[
    "custrecordzab_c_amount",
    "custrecordzab_c_amount-zabtxt",
    "custrecordzab_c_bill_date",
    "custrecordzab_c_bill_date-zabtxt",
    "custrecordzab_c_bill_to_customer",
    "custrecordzab_c_bill_to_customer-zabtxt",
    "custrecord_scg_c_billing_presentation",
    "custrecord_scg_c_billing_presentation-zabtxt",
    "custrecordzab_c_subscription.custrecordzab_s_billing_profile",
    "custrecordzab_c_subscription.custrecordzab_s_billing_profile-zabtxt",
    "custrecordzab_c_charge_item",
    "custrecordzab_c_charge_item-zabtxt",
    "custrecordzab_c_charge_item.custitem_scg_contract_group",
    "custrecordzab_c_charge_item.custitem_scg_contract_group-zabtxt",
    "custrecordzab_c_charge_item.custitem_mri_license_type",
    "custrecordzab_c_charge_item.custitem_mri_license_type-zabtxt",
    "custrecordzab_c_charge_type",
    "custrecordzab_c_charge_type-zabtxt",
    "custrecordzab_c_subscription.custrecord_scg_contracting_entity",
    "custrecordzab_c_subscription.custrecord_scg_contracting_entity-zabtxt",
    "custrecordzab_c_currency",
    "custrecordzab_c_currency-zabtxt",
    "custrecordzab_c_subscription.custrecordzab_s_customer",
    "custrecordzab_c_subscription.custrecordzab_s_customer-zabtxt",
    "custrecordzab_c_description",
    "custrecordzab_c_description-zabtxt",
    "custrecordzab_c_discount-zabtxt",
    "custrecordzab_c_forecasted_value",
    "custrecordzab_c_forecasted_value-zabtxt",
    "custrecordzab_c_gross_amount",
    "custrecordzab_c_gross_amount-zabtxt",
    "custrecordzab_c_subscription.custrecord_su_mri_guarantor",
    "custrecordzab_c_subscription.custrecord_su_mri_guarantor-zabtxt",
    "internalid",
    "internalid-zabtxt",
    "custrecordzab_c_list_rate",
    "custrecordzab_c_list_rate-zabtxt",
    "custrecordzab_c_location",
    "custrecordzab_c_location-zabtxt",
    "custrecordzab_c_quantity",
    "custrecordzab_c_quantity-zabtxt",
    "custrecordzab_c_rate",
    "custrecordzab_c_rate-zabtxt",
    "custrecordzab_c_rate_plan",
    "custrecordzab_c_rate_plan-zabtxt",
    "custrecordzab_c_reference_id",
    "custrecordzab_c_reference_id-zabtxt",
    "custrecordzab_c_end_date",
    "custrecordzab_c_end_date-zabtxt",
    "custrecordzab_c_start_date",
    "custrecordzab_c_start_date-zabtxt",
    "custrecordzab_c_subscription_item.custrecord_scg_parent_asset",
    "custrecordzab_c_subscription_item.custrecord_scg_parent_asset-zabtxt",
    "custrecordzab_c_subscription",
    "custrecordzab_c_subscription-zabtxt",
    "custrecordzab_c_subscription_item",
    "custrecordzab_c_subscription_item-zabtxt",
    "custrecordzab_c_subsidiary",
    "custrecordzab_c_subsidiary-zabtxt",
    "custrecordzab_c_term",
    "custrecordzab_c_term-zabtxt",
    "custrecordzab_c_term_multiplier",
    "custrecordzab_c_term_multiplier-zabtxt",
    "custrecordzab_c_term_rate",
    "custrecordzab_c_term_rate-zabtxt",
    "custrecordzab_c_subscription.custrecord_scg_uplift_p",
    "custrecordzab_c_subscription.custrecord_scg_uplift_p-zabtxt",
    "zab_extended_list_rate",
    "custrecordzab_c_charge_container",
    "custrecordzab_c_ship_to_address_alt",
    "custrecordzab_c_bill_to_address_alt",
    "zab_final_ship_to_string",
    "custrecordzab_c_customer",
    "custrecordzab_c_customer-zabtxt",
    "custrecordzab_c_subscription.custrecordzab_s_currency",
    "custrecordzab_c_subscription.custrecordzab_s_subsidiary",
    "custrecordzab_c_subscription.custrecordzab_s_location",
    "custrecordzab_c_subscription.custrecordzab_s_payment_terms",
    "custrecordzab_c_subscription.custrecordzab_s_line_item_shipping",
    "zab_invert_negative_qty",
    "zab_charge_has_mixed_rates",
    "zab_group_key",
    "zab_charge_count",
    "zab_charge_has_discount",
    "zab_created_by_zone_billing",
    "zab_line_id"
];
