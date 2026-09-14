import React from "react";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import { PricingMetrics } from "@/lib/pricingParser";

interface InvoiceDocumentProps {
  invoiceId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  packageName: string;
  numberOfTravelers: number;
  preferredStartDate: string;
  metrics: PricingMetrics;
  tenantName: string;
  primaryColor?: string;
  secondaryColor?: string;
  paymentLink: string;
  specs: {
    duration?: string;
    extraNights?: string;
    destinations?: string;
    hotelTier?: string;
    transportMode?: string;
    season?: string;
    excursions?: string;
    addOns?: string;
  };
}

export default function InvoiceDocument({
  invoiceId,
  date,
  customerName,
  customerEmail,
  packageName,
  numberOfTravelers,
  preferredStartDate,
  metrics,
  tenantName,
  primaryColor = "#0B7C8A",
  secondaryColor = "#041A16",
  paymentLink,
  specs,
}: InvoiceDocumentProps) {
  // Styles for PDF document
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: "Helvetica",
      fontSize: 10,
      color: "#334155",
      backgroundColor: "#ffffff",
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      paddingBottom: 15,
      marginBottom: 20,
    },
    agencyInfo: {
      flexDirection: "column",
    },
    agencyName: {
      fontSize: 18,
      fontWeight: "bold",
      color: secondaryColor,
    },
    agencyTagline: {
      fontSize: 9,
      color: "#64748b",
      marginTop: 2,
    },
    invoiceMeta: {
      flexDirection: "column",
      alignItems: "flex-end",
    },
    invoiceTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: primaryColor,
    },
    invoiceId: {
      fontSize: 10,
      color: "#475569",
      marginTop: 4,
    },
    invoiceDate: {
      fontSize: 9,
      color: "#64748b",
      marginTop: 2,
    },
    detailsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      padding: 12,
      backgroundColor: "#f8fafc",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    detailsCol: {
      flexDirection: "column",
      width: "48%",
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: "bold",
      color: secondaryColor,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      paddingBottom: 3,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2,
    },
    detailLabel: {
      color: "#64748b",
      fontSize: 9,
    },
    detailVal: {
      color: "#0f172a",
      fontWeight: "bold",
      fontSize: 9,
    },
    tableContainer: {
      flexDirection: "column",
      marginTop: 10,
      marginBottom: 15,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: primaryColor,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    tableHeaderCell: {
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: 9,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      paddingVertical: 8,
      paddingHorizontal: 8,
      alignItems: "center",
    },
    tableRowAlternate: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      backgroundColor: "#f8fafc",
      paddingVertical: 8,
      paddingHorizontal: 8,
      alignItems: "center",
    },
    colDesc: {
      width: "70%",
    },
    colAmount: {
      width: "30%",
      textAlign: "right",
    },
    cellDescTitle: {
      fontWeight: "bold",
      color: "#0f172a",
      fontSize: 9,
    },
    cellDescSub: {
      color: "#64748b",
      fontSize: 8,
      marginTop: 1,
    },
    cellAmountVal: {
      color: "#0f172a",
      fontWeight: "bold",
      fontSize: 9,
    },
    summaryContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
    },
    summaryBox: {
      width: "45%",
      flexDirection: "column",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 6,
      padding: 10,
      backgroundColor: "#ffffff",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
    },
    summaryLabel: {
      color: "#64748b",
      fontSize: 9,
    },
    summaryVal: {
      color: "#0f172a",
      fontWeight: "bold",
      fontSize: 9,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 6,
      marginTop: 4,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
    },
    totalLabel: {
      color: secondaryColor,
      fontWeight: "bold",
      fontSize: 11,
    },
    totalVal: {
      color: primaryColor,
      fontWeight: "bold",
      fontSize: 11,
    },
    ctaContainer: {
      marginTop: 30,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      paddingTop: 20,
    },
    ctaText: {
      fontSize: 10,
      color: "#475569",
      marginBottom: 8,
    },
    ctaButton: {
      backgroundColor: primaryColor,
      color: "#ffffff",
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 4,
      textDecoration: "none",
      fontWeight: "bold",
      fontSize: 10,
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      color: "#94a3b8",
      fontSize: 8,
      borderTopWidth: 1,
      borderTopColor: "#f1f5f9",
      paddingTop: 10,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyName}>{tenantName}</Text>
            <Text style={styles.agencyTagline}>Premium Customizable Tours & Getaways</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceId}>ID: #{invoiceId}</Text>
            <Text style={styles.invoiceDate}>Date: {date}</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailsCol}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailVal}>{customerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailVal}>{customerEmail}</Text>
            </View>
          </View>
          <View style={styles.detailsCol}>
            <Text style={styles.sectionTitle}>Trip Specifications</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tour Package:</Text>
              <Text style={styles.detailVal}>{packageName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Travelers Count:</Text>
              <Text style={styles.detailVal}>{numberOfTravelers}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Departure Date:</Text>
              <Text style={styles.detailVal}>{preferredStartDate}</Text>
            </View>
          </View>
        </View>

        {/* Itemized Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Item Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount, { textAlign: "right" }]}>Price (USD)</Text>
          </View>

          {/* Row 1: Base Cost */}
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.cellDescTitle}>Base Tour Package Cost</Text>
              <Text style={styles.cellDescSub}>
                Standard route base logistics and planning (Duration: {specs.duration || "Standard"})
              </Text>
            </View>
            <Text style={[styles.colAmount, styles.cellAmountVal]}>
              ${metrics.baseCost.toLocaleString()}
            </Text>
          </View>

          {/* Row 2: Accommodation */}
          <View style={styles.tableRowAlternate}>
            <View style={styles.colDesc}>
              <Text style={styles.cellDescTitle}>Hotel Selection Surcharge</Text>
              <Text style={styles.cellDescSub}>
                Tier: {specs.hotelTier || "Standard"} Accommodation
              </Text>
            </View>
            <Text style={[styles.colAmount, styles.cellAmountVal]}>
              ${metrics.accommodationCost.toLocaleString()}
            </Text>
          </View>

          {/* Row 3: Transportation */}
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.cellDescTitle}>Private Transport Logistics</Text>
              <Text style={styles.cellDescSub}>
                Class: {specs.transportMode || "Standard Driver"}
              </Text>
            </View>
            <Text style={[styles.colAmount, styles.cellAmountVal]}>
              ${metrics.transportCost.toLocaleString()}
            </Text>
          </View>

          {/* Row 4: Tickets / Surcharges */}
          {metrics.destinationSurcharges > 0 && (
            <View style={styles.tableRowAlternate}>
              <View style={styles.colDesc}>
                <Text style={styles.cellDescTitle}>Destination Surcharges & Tickets</Text>
                <Text style={styles.cellDescSub}>
                  Includes entry passes for: {specs.destinations || "Selected Locations"}
                </Text>
              </View>
              <Text style={[styles.colAmount, styles.cellAmountVal]}>
                ${metrics.destinationSurcharges.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Row 5: Add-ons */}
          {metrics.addOnsCost > 0 && (
            <View style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.cellDescTitle}>Add-ons & Meal Packages</Text>
                <Text style={styles.cellDescSub}>
                  Selected additions: {specs.addOns || "Breakfast/Dinner"} {specs.extraNights ? `(${specs.extraNights} Extra Nights)` : ""}
                </Text>
              </View>
              <Text style={[styles.colAmount, styles.cellAmountVal]}>
                ${metrics.addOnsCost.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Row 6: Excursions */}
          {metrics.activityCost > 0 && (
            <View style={styles.tableRowAlternate}>
              <View style={styles.colDesc}>
                <Text style={styles.cellDescTitle}>Selected Custom Excursions</Text>
                <Text style={styles.cellDescSub}>
                  Special events: {specs.excursions || "None"}
                </Text>
              </View>
              <Text style={[styles.colAmount, styles.cellAmountVal]}>
                ${metrics.activityCost.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Summary Box */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryVal}>${(metrics.baseCost + metrics.accommodationCost + metrics.transportCost + metrics.destinationSurcharges + metrics.activityCost + metrics.addOnsCost).toLocaleString()}</Text>
            </View>
            {metrics.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Group Discount:</Text>
                <Text style={[styles.summaryVal, { color: "#dc2626" }]}>-${metrics.discount.toLocaleString()}</Text>
              </View>
            )}
            {metrics.customCharges > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Custom Agency Fee:</Text>
                <Text style={styles.summaryVal}>${metrics.customCharges.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxes & Fees:</Text>
              <Text style={styles.summaryVal}>${metrics.taxes.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalVal}>${metrics.totalPrice.toLocaleString()} USD</Text>
            </View>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>To view details or settle this invoice online, please visit our payment portal:</Text>
          <Link src={paymentLink} style={styles.ctaButton}>
            Pay Invoice Online
          </Link>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for choosing {tenantName}! Settle your invoice online before the departure date.
        </Text>
      </Page>
    </Document>
  );
}
