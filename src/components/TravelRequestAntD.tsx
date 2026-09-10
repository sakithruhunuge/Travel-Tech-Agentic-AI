"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useTravelRequest } from "@/context/TravelRequestContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useToast } from "@/context/ToastContext";
import { useLocale } from "next-intl";
import {
  ConfigProvider,
  Row,
  Col,
  Card,
  Typography,
  Divider,
  Button,
  InputNumber,
  DatePicker,
  Select,
  Input,
  Result,
  Space,
  Alert,
  Tag,
} from "antd";
import {
  CalendarOutlined,
  TeamOutlined,
  CompassOutlined,
  FileTextOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const BASE_PRICES: Record<string, number> = {
  "cultural-triangle": 500,
  "southern-beach": 600,
  "hill-country": 650,
  "wildlife-safari": 480,
  "grand-tour": 1400,
  "custom": 350,
};

const ALL_DESTINATIONS = [
  { value: "Colombo", label: "Colombo" },
  { value: "Sigiriya", label: "Sigiriya" },
  { value: "Dambulla", label: "Dambulla" },
  { value: "Kandy", label: "Kandy" },
  { value: "Polonnaruwa", label: "Polonnaruwa" },
  { value: "Galle", label: "Galle" },
  { value: "Mirissa", label: "Mirissa" },
  { value: "Unawatuna", label: "Unawatuna" },
  { value: "Bentota", label: "Bentota" },
  { value: "Nuwara Eliya", label: "Nuwara Eliya" },
  { value: "Ella", label: "Ella" },
  { value: "Horton Plains", label: "Horton Plains" },
  { value: "Yala National Park", label: "Yala National Park" },
  { value: "Udawalawe", label: "Udawalawe" },
  { value: "Bundala", label: "Bundala" },
];



interface TravelRequestAntDProps {
  isModal?: boolean;
}

export default function TravelRequestAntD({ isModal = false }: TravelRequestAntDProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const locale = useLocale();

  const {
    formData,
    updateFormField,
    selectPackageById,
    resetForm,
    closeFormModal,
    packages,
  } = useTravelRequest();
  const { addToast } = useToast();
  const { formatPriceString, formatPrice, currency } = useCurrency();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const allPackages = packages;

  // Dynamic invoice calculations
  const selectedPackageId = formData.packageId;
  const travelersCount = formData.numberOfTravelers || 1;
  const basePrice = BASE_PRICES[selectedPackageId] || 0;
  const customDests = formData.customDestinations || [];
  const destinationSurcharge = selectedPackageId === "custom" ? customDests.length * 100 : 0;
  const pricePerTraveler = basePrice + destinationSurcharge;
  const subtotal = pricePerTraveler * travelersCount;
  const taxRate = 0.12; // 12% Local taxes & service charge
  const taxes = subtotal * taxRate;

  // 5% discount for 2 travelers, 10% discount for 3+ travelers
  const discountRate = travelersCount >= 3 ? 0.10 : travelersCount === 2 ? 0.05 : 0;
  const discount = subtotal * discountRate;
  const totalPrice = subtotal + taxes - discount;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.packageId) {
      errors.packageId = "Please select a travel package or custom tour from the choices above.";
    }
    if (!formData.numberOfTravelers || formData.numberOfTravelers < 1) {
      errors.numberOfTravelers = "Travelers count must be at least 1.";
    }
    if (formData.packageId === "custom" && customDests.length === 0) {
      errors.customDestinations = "Please select at least one destination for your custom itinerary.";
    }
    if (!formData.preferredStartDate) {
      errors.preferredStartDate = "Please select a preferred departure date.";
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      if (formData.preferredStartDate < todayStr) {
        errors.preferredStartDate = "Departure date must be in the future.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      addToast("error", "Please correct the errors in the form before submitting.");
      return;
    }

    // Authentication Guard
    if (sessionStatus !== "authenticated") {
      const currentPage = window.location.pathname + window.location.search;
      const draftState = {
        formData,
        currentStep: 0,
        isFormModalOpen: true,
        returnUrl: currentPage,
      };

      try {
        sessionStorage.setItem("travel_request_draft", JSON.stringify(draftState));
      } catch {
        addToast("error", "Failed to save draft progress.");
      }

      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPage)}&restoreForm=true`);
      return;
    }

    setSubmitStatus("loading");
    setErrorMessage("");

    try {
      let finalSpecialRequests = formData.specialRequests;
      if (formData.packageId === "custom") {
        const destinationsStr = formData.customDestinations.join(", ");
        finalSpecialRequests = `Custom Destinations: [${destinationsStr}]\n\n${formData.specialRequests}`;
      }

      const res = await fetch("/api/travel-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: formData.packageId === "custom" ? "" : formData.packageId,
          packageName: formData.packageName,
          numberOfTravelers: formData.numberOfTravelers,
          preferredStartDate: formData.preferredStartDate,
          specialRequests: finalSpecialRequests,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to submit travel request");
      }

      setSubmitStatus("success");
      addToast("success", "Travel request submitted successfully!");
      resetForm();

      setTimeout(() => {
        router.push("/my-requests");
      }, 3000);
    } catch (err) {
      addToast("error", "Failed to submit your travel request. Please try again.");
      setSubmitStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };

  const isAuthenticated = sessionStatus === "authenticated";

  // If success, display a stylized Result screen
  if (submitStatus === "success") {
    return (
      <Result
        status="success"
        title={<Title level={2} style={{ color: "#041A16" }}>Travel Request Submitted!</Title>}
        subTitle={
          <Text style={{ fontSize: 15, color: "#164E3F" }}>
            Your customizable itinerary request has been saved. Our expert local travel planner will review and coordinate details within 24 hours.
          </Text>
        }
        extra={[
          <Button
            type="primary"
            key="requests"
            size="large"
            onClick={() => {
              closeFormModal();
              router.push("/my-requests");
            }}
            style={{ backgroundColor: "#0B7C8A", borderColor: "#0B7C8A", borderRadius: 8 }}
          >
            View Requests
          </Button>,
          <Button
            key="close"
            size="large"
            onClick={() => {
              closeFormModal();
              router.push("/");
            }}
            style={{ borderRadius: 8 }}
          >
            Close
          </Button>,
        ]}
        style={{ padding: "48px 0" }}
      />
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#FF8B50",
          colorSuccess: "#25A5FE",
          colorWarning: "#FF8B50",
          borderRadius: 12,
          fontFamily: "Inter, sans-serif",
        },
      }}
    >
      <div style={{ width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: "left" }}>
          <Title level={isModal ? 3 : 2} style={{ margin: 0, fontWeight: 900, color: "#041A16" }}>
            Plan Your Ceylon Getaway
          </Title>
          <Paragraph style={{ margin: "4px 0 0 0", color: "#555", fontSize: 13 }}>
            Choose a package or request a customized tour, configure travelers, and view pricing breakdown instantly.
          </Paragraph>
        </div>

        {submitStatus === "error" && (
          <Alert
            message="Submission Failed"
            description={errorMessage}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 24, borderRadius: 8 }}
          />
        )}

        <Row gutter={[32, 32]}>
          {/* Left Column: Form Controls */}
          <Col xs={24} lg={15}>
            <Space direction="vertical" size={24} style={{ width: "100%" }}>
              {/* Package Grid */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 14, color: "#041A16", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    1. Select Travel Package
                  </Text>
                  {formErrors.packageId && (
                    <Text type="danger" style={{ fontSize: 12 }}>
                      {formErrors.packageId}
                    </Text>
                  )}
                </div>

                <Row gutter={[16, 16]}>
                  {allPackages.map((pkg) => {
                    const isSelected = pkg.id === selectedPackageId;
                    return (
                      <Col xs={24} sm={12} md={8} key={pkg.id}>
                        <Card
                          hoverable
                          onClick={() => selectPackageById(pkg.id)}
                          cover={
                            <div style={{ height: 110, overflow: "hidden", position: "relative" }}>
                              <img
                                alt={pkg.name}
                                src={pkg.image}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                              {isSelected && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    backgroundColor: "#0B7C8A",
                                    color: "#fff",
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                  }}
                                >
                                  <CheckOutlined style={{ fontSize: 12, fontWeight: "bold" }} />
                                </div>
                              )}
                            </div>
                          }
                          bodyStyle={{ padding: 12 }}
                          style={{
                            borderRadius: 14,
                            overflow: "hidden",
                            border: isSelected ? "2px solid #0B7C8A" : "1.5px solid #eaeaea",
                            boxShadow: isSelected ? "0 4px 16px rgba(11, 124, 138, 0.15)" : "none",
                            transform: isSelected ? "scale(1.02)" : "scale(1)",
                            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                        >
                          <Title level={5} style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: "#041A16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {pkg.name}
                          </Title>
                          <Space size={6} wrap>
                            <Tag color="cyan" style={{ fontSize: 10, border: "none", borderRadius: 4 }}>
                              <ClockCircleOutlined /> {pkg.duration}
                            </Tag>
                            <Tag color="gold" style={{ fontSize: 10, border: "none", borderRadius: 4 }}>
                              <svg style={{ width: 12, height: 12, marginRight: 6 }} viewBox="0 0 20 20" fill="#D97706" aria-hidden="true">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {pkg.rating}
                            </Tag>
                          </Space>
                          <div style={{ marginTop: 8 }}>
                            <Text strong style={{ color: isSelected ? "#0B7C8A" : "#8c8c8c", fontSize: 12 }}>
                              {formatPriceString(pkg.priceRange)}
                            </Text>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}

                  {/* Professional Customizer Card */}
                  <Col xs={24} sm={12} md={8}>
                    <Card
                      hoverable
                      onClick={() => {
                        closeFormModal();
                        router.push("/customize-tour");
                      }}
                      style={{
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "2px dashed #0B7C8A",
                        background: "rgba(11, 124, 138, 0.02)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                      cover={
                        <div style={{ height: 110, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0fdfa" }}>
                          <CompassOutlined style={{ fontSize: 32, color: "#0B7C8A" }} />
                        </div>
                      }
                      bodyStyle={{ padding: 12, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                    >
                      <div>
                        <Title level={5} style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: "#041A16" }}>
                          Interactive Map Customizer
                        </Title>
                        <Paragraph style={{ margin: 0, fontSize: 11, color: "#8c8c8c", lineHeight: "1.3" }}>
                          Plan your trip, pick map pins, configure meals, and get live quotes.
                        </Paragraph>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Text strong style={{ color: "#0B7C8A", fontSize: 12 }}>
                          Tailor-Made / Live Price
                        </Text>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* Form Details */}
              <Card style={{ borderRadius: 16, border: "1.5px solid #eaeaea" }}>
                <Text strong style={{ display: "block", fontSize: 14, color: "#041A16", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                  2. Travelers & Departure Settings
                </Text>

                <Row gutter={[24, 20]}>
                  {/* Travelers Input */}
                  <Col xs={24} sm={12}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                        <TeamOutlined /> Number of Travelers
                      </label>
                      <InputNumber
                        min={1}
                        max={100}
                        value={formData.numberOfTravelers}
                        onChange={(val) => updateFormField("numberOfTravelers", val || 1)}
                        style={{ width: "100%", borderRadius: 8 }}
                        size="large"
                      />
                      {formErrors.numberOfTravelers && (
                        <Text type="danger" style={{ fontSize: 11 }}>
                          {formErrors.numberOfTravelers}
                        </Text>
                      )}
                    </Space>
                  </Col>

                  {/* Departure Date Picker */}
                  <Col xs={24} sm={12}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                        <CalendarOutlined /> Preferred Start Date
                      </label>
                      <DatePicker
                        value={formData.preferredStartDate ? dayjs(formData.preferredStartDate) : null}
                        onChange={(_, dateStr) => updateFormField("preferredStartDate", dateStr as string)}
                        disabledDate={(current) => current && current < dayjs().startOf("day")}
                        style={{ width: "100%", borderRadius: 8 }}
                        size="large"
                      />
                      {formErrors.preferredStartDate && (
                        <Text type="danger" style={{ fontSize: 11 }}>
                          {formErrors.preferredStartDate}
                        </Text>
                      )}
                    </Space>
                  </Col>
                </Row>



                {/* Special Requests */}
                <div style={{ marginTop: 20 }}>
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                      <FileTextOutlined /> Special Requests / Travel Notes
                    </label>
                    <Input.TextArea
                      rows={4}
                      value={formData.specialRequests}
                      onChange={(e) => updateFormField("specialRequests", e.target.value)}
                      placeholder="Describe preferred activities, hotel class preferences, dietary rules, or itinerary variations..."
                      style={{ borderRadius: 8 }}
                    />
                  </Space>
                </div>
              </Card>
            </Space>
          </Col>

          {/* Right Column: Dynamic Invoice & Submission */}
          <Col xs={24} lg={9}>
            <div style={{ position: "sticky", top: 24 }}>
              <Card
                style={{
                  borderRadius: 20,
                  border: "1.5px solid #eaeaea",
                  boxShadow: "0 8px 32px rgba(4, 26, 22, 0.04)",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                }}
                bodyStyle={{ padding: "24px" }}
              >
                {/* Card Top Border Accent */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    backgroundColor: "#0B7C8A",
                  }}
                />

                <Title level={4} style={{ margin: "0 0 16px 0", color: "#041A16", fontWeight: 800 }}>
                  Trip Summary & Invoice
                </Title>

                {/* Selection Details */}
                <div style={{ marginBottom: 20, padding: "12px 16px", backgroundColor: "#f9f9f9", borderRadius: 12 }}>
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Selected Package</Text>
                      <div style={{ fontWeight: 800, color: "#041A16", fontSize: 14 }}>
                        {selectedPackageId ? allPackages.find(p => p.id === selectedPackageId)?.name : "None selected"}
                      </div>
                    </div>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Travelers</Text>
                        <div style={{ fontWeight: 700, color: "#041A16" }}>
                          {travelersCount} {travelersCount === 1 ? "Traveler" : "Travelers"}
                        </div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Start Date</Text>
                        <div style={{ fontWeight: 700, color: "#041A16" }}>
                          {formData.preferredStartDate
                            ? dayjs(formData.preferredStartDate).format("MMM DD, YYYY")
                            : "Not selected"}
                        </div>
                      </Col>
                    </Row>
                  </Space>
                </div>

                <Divider style={{ margin: "16px 0" }} />

                {/* Itemized Pricing */}
                <Space direction="vertical" size={12} style={{ width: "100%", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text type="secondary">Base Cost ({travelersCount} × {formatPrice(basePrice)})</Text>
                    <Text strong style={{ color: "#041A16" }}>
                      {formatPrice(basePrice * travelersCount)}
                    </Text>
                  </div>

                  {selectedPackageId === "custom" && customDests.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text type="secondary">
                        Destinations Surcharge ({customDests.length} cities × {formatPrice(100)} × {travelersCount})
                      </Text>
                      <Text strong style={{ color: "#041A16" }}>
                        +{formatPrice(destinationSurcharge * travelersCount)}
                      </Text>
                    </div>
                  )}

                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text type="secondary">
                        Multi-traveler Discount ({(discountRate * 100).toFixed(0)}%)
                      </Text>
                      <Text strong style={{ color: "#52c41a" }}>
                        -{formatPrice(discount)}
                      </Text>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text type="secondary">Local Taxes & Service Fee (12%)</Text>
                    <Text strong style={{ color: "#041A16" }}>
                      {formatPrice(taxes)}
                    </Text>
                  </div>
                </Space>

                <Divider style={{ margin: "16px 0" }} />

                {/* Grand Total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
                  <Title level={5} style={{ margin: 0, color: "#041A16", fontWeight: 800 }}>Total Price</Title>
                  <div>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "#0B7C8A" }}>
                      {formatPrice(totalPrice, true)}
                    </span>
                    <span style={{ fontSize: 12, color: "#8c8c8c", marginLeft: 4 }}>{currency}</span>
                  </div>
                </div>

                {/* Security and Info alerts */}
                {!isAuthenticated ? (
                  <Alert
                    message="Sign In Required"
                    description="You'll be redirected to login. Your selection draft will be fully preserved."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16, fontSize: 11, borderRadius: 8 }}
                  />
                ) : (
                  session?.user && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", backgroundColor: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, marginBottom: 16 }}>
                      <UserOutlined style={{ color: "#52c41a" }} />
                      <div style={{ fontSize: 11, color: "#164E3F" }}>
                        Requesting as <span style={{ fontWeight: 700 }}>{session.user.name}</span>
                      </div>
                    </div>
                  )
                )}

                {/* Call To Actions */}
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={submitStatus === "loading"}
                    disabled={!selectedPackageId}
                    style={{
                      width: "100%",
                      backgroundColor: !isAuthenticated ? "#D4AF37" : "#0B7C8A",
                      borderColor: !isAuthenticated ? "#D4AF37" : "#0B7C8A",
                      color: "#fff",
                      fontWeight: 800,
                      borderRadius: 8,
                      height: 48,
                    }}
                  >
                    {!isAuthenticated ? "Sign In & Submit" : "Submit Travel Request"}
                  </Button>

                  <Button
                    size="large"
                    onClick={() => {
                      resetForm();
                      if (isModal) closeFormModal();
                    }}
                    style={{ width: "100%", borderRadius: 8, height: 44 }}
                  >
                    {isModal ? "Cancel" : "Reset Form"}
                  </Button>
                </Space>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}
