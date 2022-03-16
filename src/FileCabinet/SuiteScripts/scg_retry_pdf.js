/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/record", "N/xml", "N/file", "N/render"], (
    record,
    xmlMod,
    file,
    render
) => {
    const DELIVERY_FOLDER_CONSOL_MAIL = 14937;

    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = scriptContext => {
        let try1 = [
            "56199",
            "55205",
            "56300",
            "56200",
            "55218",
            "56306",
            "56205",
            "55221",
            "56407",
            "56308",
            "55223",
            "56408",
            "55224",
            "55225",
            "55226",
            "56409",
            "56310",
            "55227",
            "56208",
            "55228",
            "56410",
            "56311",
            "55229",
            "55230",
            "56209",
            "56411",
            "56312",
            "55231",
            "55232",
            "56412",
            "55233",
            "55234",
            "55235",
            "56211",
            "56414",
            "55237",
            "55238",
            "56316",
            "56318",
            "56435",
            "56336",
            "55283",
            "56437",
            "56229",
            "56343",
            "55298",
            "56346",
            "56242",
            "56354",
            "56457",
            "57837",
            "56363",
            "56250",
            "57843",
            "56253",
            "57847",
            "56254",
            "56256",
            "56371",
            "57861",
            "57863",
            "57866",
            "57865",
            "56476",
            "56260",
            "57867",
            "57868",
            "56477",
            "56377",
            "57869",
            "57887",
            "56388",
            "57891",
            "56269",
            "57893",
            "56494",
            "58006",
            "56274",
            "56396",
            "56495",
            "58007",
            "58008",
            "56397",
            "56496",
            "58111",
            "58089",
            "59119",
            "58150",
            "58248",
            "58615",
            "59121",
            "58249",
            "59123",
            "58616",
            "59176",
            "58179",
            "58278",
            "58279",
            "58653",
            "59906",
            "59909",
            "60107",
            "59746",
            "59747",
            "59749",
            "59748",
            "59911",
            "59760",
            "60114",
            "58670",
            "59923",
            "60121",
            "58671",
            "59778",
            "59925",
            "58672",
            "54545",
            "59926",
            "58692",
            "63023",
            "54573",
            "59945",
            "60155",
            "58693",
            "63024",
            "54574",
            "59946",
            "60158",
            "59948",
            "60160",
            "58697",
            "63030",
            "59952",
            "54580",
            "60167",
            "59958",
            "63704",
            "63919",
            "63920",
            "59991",
            "63070",
            "63921",
            "64300",
            "59992",
            "63922",
            "64301",
            "59993",
            "64325",
            "63098",
            "63953",
            "63958",
            "64216",
            "64428",
            "64332",
            "64429",
            "64509",
            "64230",
            "64345",
            "64520",
            "64348"
        ];
        createPDFArray(try1);
    };

    /**
     *
     * @param pdfArray {[Number]}
     */
    function createPDFArray(pdfArray) {
        try {
            var xml =
                '<?xml version="1.0"?>\n<!DOCTYPE pdf.html PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n';

            //    xml += "<pdfset>";

            var toWrite = [
                '<?xml version="1.0"?>\n<!DOCTYPE pdf.html PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">',
                "<pdfset>"
            ];

            const arrayLength = pdfArray.length;
            log.debug({
                title: "Mail INvoice count",
                details: arrayLength
            });

            //loop through array and add to xml set
            for (var i = 0; i < arrayLength; i++) {
                var fileId = pdfArray[i];
                var fileUrl = file.load({
                    id: fileId
                });

                var pdf_fileURL = xmlMod.escape({
                    xmlText: fileUrl.url
                });

                toWrite.push("<pdf src='" + pdf_fileURL + "'/>");

                //xml += "<pdf.html src='"+ pdf_fileURL +"'/>\n";
            }
            toWrite.push("</pdfset>");

            xml += "</pdfset>";

            log.debug({
                title: "bound template",
                details: xmlMod.escape({ xmlText: toWrite.join("\n") })
            });
            var consolidatePDF = render.xmlToPdf({
                xmlString: toWrite.join("\n")
            });
            const newFileName =
                "MailInvRun " + new Date().toISOString() + ".pdf";
            consolidatePDF.folder = DELIVERY_FOLDER_CONSOL_MAIL;
            consolidatePDF.name = newFileName;
            const consolFileID = consolidatePDF.save();
            log.debug({
                title: "SAVED CONSOLIDATED FILE",
                details: consolFileID
            });
        } catch (e) {
            log.error({
                title: "ERROR CONSOLIDATING PDF",
                details: e
            });
        }
    }

    return { execute };
});
