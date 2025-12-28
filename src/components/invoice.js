import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Row, Col, Spinner, Alert, Pagination, Card, Container, Badge } from "react-bootstrap";
import { Printer, Download, FileText, RefreshCw, Eye, Calculator, Save, Search, Calendar, User, Phone, MapPin, MessageCircle, X, CheckCircle } from "lucide-react";

// API Base URL
const API_BASE_URL = "http://localhost:5000/api";

const InvoicePage = () => {
  // ================= COMPANY INFO =================
  const [companyInfo, setCompanyInfo] = useState({
    name: "SRI RAJA MOSQUITO NETLON SERVICES",
    description: "Manufacture & Dealer in Mosquito & Insect Net (WholeSale & Retail)",
    phone: "+91 9790569529",
    gstin: "33BECPR927M1ZU",
    address: "Ryan Complex Vadavalli Road, Edayarpalayam, Coimbatore-25",
    branch: "Edayarpalayam",
  });

  // ================= BANK DETAILS =================
  const bankDetails = {
    accountHolder: "RAJASEKAR P",
    accountNumber: "50100774198590",
    ifsc: "HDFC0006806",
    branch: "EDAYARPALAYAM",
    accountType: "SAVING"
  };

  // ================= LOGO PATH =================
  const LOGO_PATH = "/asset/logo.png";

  // ================= STATE =================
  const [quotationNo, setQuotationNo] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showGstModal, setShowGstModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  
  // ================= QUOTATIONS LIST STATE =================
  const [quotations, setQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [quotationsError, setQuotationsError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // ================= CALCULATIONS =================
  const calculateGst = (totalAmount) => {
    const cgst = totalAmount * 0.09;
    const sgst = totalAmount * 0.09;
    const grandTotal = totalAmount + cgst + sgst;
    return { cgst, sgst, grandTotal };
  };

  // ================= API FUNCTIONS =================
  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/company/info`);
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
      }
    } catch (err) {
      console.error('Error fetching company info:', err);
    }
  };

  // Fetch all quotations with pagination
  const fetchQuotations = async (page = 1, search = "") => {
    setQuotationsLoading(true);
    setQuotationsError("");
    
    try {
      let url = `${API_BASE_URL}/quotations?page=${page}&per_page=${perPage}`;
      if (search) {
        url += `&search=${search}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch quotations');
      }
      
      const data = await response.json();
      setQuotations(data.quotations || []);
      setTotalPages(data.pagination?.pages || 1);
      setCurrentPage(data.pagination?.page || 1);
      setTotalQuotations(data.pagination?.total || 0);
      
    } catch (err) {
      setQuotationsError(`Error: ${err.message}`);
    } finally {
      setQuotationsLoading(false);
    }
  };

  const fetchQuotationByNumber = async (number, gstin = "") => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // First, try to find the quotation in the already loaded list
      const foundQuotation = quotations.find(
        q => q.customerInfo?.estimateNo === number || 
             q.id?.toString() === number || 
             q.customerInfo?.estimateNo?.toString() === number
      );
      
      let quotation = foundQuotation;
      
      // If not found in the list, try to fetch from API
      if (!quotation) {
        // Try different API endpoints
        try {
          const response = await fetch(`${API_BASE_URL}/quotations/number/${number}`);
          if (response.ok) {
            quotation = await response.json();
          }
        } catch (err) {
          // If direct fetch fails, try searching
          const searchResponse = await fetch(`${API_BASE_URL}/quotations?search=${number}`);
          if (searchResponse.ok) {
            const data = await searchResponse.json();
            quotation = data.quotations?.find(
              q => q.customerInfo?.estimateNo === number || 
                   q.id?.toString() === number
            );
          }
        }
      }
      
      if (!quotation) {
        throw new Error(`No quotation found with number: ${number}. Please check the number and try again.`);
      }
      
      // Ensure items and totals exist
      if (!quotation.items || !quotation.totals) {
        throw new Error('Quotation data is incomplete');
      }
      
      // Add GSTIN to quotation data
      const updatedQuotation = {
        ...quotation,
        customerInfo: {
          ...quotation.customerInfo,
          billTo: quotation.customerInfo?.billTo || "N/A",
          contactNo: quotation.customerInfo?.contactNo || "N/A",
          stateName: quotation.customerInfo?.stateName || "N/A",
          estimateNo: quotation.customerInfo?.estimateNo || `QTN-${quotation.id}`,
          estimateDate: quotation.customerInfo?.estimateDate || "N/A",
          gstin: gstin || quotation.customerInfo?.gstin || ""
        },
        totals: {
          totalAmount: quotation.totals?.totalAmount || 0,
          ...calculateGst(quotation.totals?.totalAmount || 0)
        }
      };
      
      setInvoiceData(updatedQuotation);
      setShowGstModal(false);
      setShowInvoiceModal(true);
      setSuccess("Quotation loaded successfully!");
      
      // Refresh quotations list
      fetchQuotations(currentPage, searchTerm);
      
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveInvoiceWithGst = async () => {
    if (!invoiceData) return;
    
    setSaving(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/quotations/${invoiceData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invoiceData,
          customerInfo: {
            ...invoiceData.customerInfo,
            gstin: customerGstin
          },
          isInvoice: true,
          invoiceDate: new Date().toISOString().split('T')[0],
          invoiceNumber: invoiceData.customerInfo?.estimateNo || `INV-${invoiceData.id}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save invoice');
      }

      const savedInvoice = await response.json();
      setInvoiceData(savedInvoice);
      setSuccess("Invoice saved successfully with GSTIN!");
      
      // Refresh quotations list but DON'T close modal
      fetchQuotations(currentPage, searchTerm);

    } catch (err) {
      setError(`Error saving invoice: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ================= HANDLERS =================
  const handleSearchQuotation = () => {
    if (!quotationNo.trim()) {
      setError("Please enter a quotation number");
      return;
    }
    
    setShowGstModal(true);
  };

  const handleSubmitGst = () => {
    if (!customerGstin.trim()) {
      setError("Please enter GSTIN");
      return;
    }
    
    fetchQuotationByNumber(quotationNo, customerGstin);
  };

  const resetForm = () => {
    setQuotationNo("");
    setCustomerGstin("");
    setInvoiceData(null);
    setError("");
    setSuccess("");
  };

  const handleSearchQuotations = () => {
    fetchQuotations(1, searchTerm);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchQuotations(page, searchTerm);
  };

  const handleGenerateFromTable = (quotation) => {
    // Extract the estimate number from the quotation
    const estimateNo = quotation.customerInfo?.estimateNo || quotation.id.toString();
    setQuotationNo(estimateNo);
    
    // Check if quotation already has GSTIN
    if (quotation.customerInfo?.gstin) {
      // If GSTIN exists, fetch directly
      fetchQuotationByNumber(estimateNo, quotation.customerInfo.gstin);
    } else {
      // If no GSTIN, show GST modal
      setShowGstModal(true);
    }
  };

  // ================= WHATSAPP INTEGRATION =================
  const handleWhatsappShare = () => {
    if (!invoiceData || !invoiceData.customerInfo?.contactNo) {
      setError("Customer contact number is required for WhatsApp sharing");
      return;
    }

    // Generate default message
    const defaultMessage = `Dear ${invoiceData.customerInfo.billTo},\n\nYour invoice ${invoiceData.customerInfo.estimateNo} has been generated.\nTotal Amount: ₹${invoiceData.totals.grandTotal.toFixed(2)}\n\nThank you for your business!\n${companyInfo.name}`;
    
    setWhatsappMessage(defaultMessage);
    setShowWhatsappModal(true);
  };

  const sendWhatsappMessage = () => {
    if (!invoiceData || !invoiceData.customerInfo?.contactNo) return;
    
    // Clean phone number (remove +91 and spaces)
    const phoneNumber = invoiceData.customerInfo.contactNo.replace(/[+\s]/g, '');
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(whatsappMessage);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open in new tab
    window.open(whatsappUrl, '_blank');
    
    // Close modal
    setShowWhatsappModal(false);
  };

  // ================= DOWNLOAD AS HTML =================
  const handleDownload = () => {
    if (!invoiceData) return;
    
    const html = generateInvoiceHTML(invoiceData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoiceData.customerInfo.estimateNo || invoiceData.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ================= PRINT =================
  const handlePrint = () => {
    if (!invoiceData) return;
    
    const html = generateInvoiceHTML(invoiceData);
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert("Popup blocked! Please allow popups for this site.");
      return;
    }
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateInvoiceHTML = (invoice) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.customerInfo.estimateNo || invoice.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; padding: 24px; background: #f9fafb; }
    .invoice-container { max-width: 840px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 32px; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 12px; }
    
    /* Header Section */
    .company-header { display: flex; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
    .logo-container { flex: 0 0 100px; margin-right: 24px; }
    .logo { width: 100px; height: 100px; object-fit: contain; border-radius: 8px; border: 1px solid #e5e7eb; }
    .company-details { flex: 1; }
    .company-details h2 { color: #111827; margin-bottom: 8px; font-size: 24px; font-weight: 700; }
    .company-details p { margin-bottom: 4px; color: #6b7280; font-size: 14px; }
    .highlight { color: #2563eb; font-weight: 600; }
    .gstin { 
      background: #1e40af; 
      color: white; 
      padding: 6px 12px; 
      border-radius: 6px; 
      display: inline-block; 
      margin-top: 12px; 
      font-weight: 500; 
      font-size: 13px; 
      letter-spacing: 0.5px; 
    }
    
    /* Invoice Title */
    .invoice-title { 
      text-align: center; 
      margin: 32px 0; 
      padding: 16px; 
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
      border-radius: 8px;
      font-size: 24px; 
      font-weight: 700; 
      color: white; 
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Details Grid */
    .details-grid { 
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }
    .bill-to, .invoice-details { 
      padding: 20px; 
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .bill-to h4, .invoice-details h4 { 
      color: #1e40af; 
      margin-bottom: 16px; 
      padding-bottom: 8px; 
      border-bottom: 2px solid #dbeafe; 
      font-size: 16px;
      font-weight: 600;
    }
    .detail-row {
      display: flex;
      margin-bottom: 10px;
      align-items: flex-start;
    }
    .detail-label {
      flex: 0 0 120px;
      font-weight: 500;
      color: #4b5563;
      font-size: 14px;
    }
    .detail-value {
      flex: 1;
      color: #1f2937;
      font-weight: 400;
      font-size: 14px;
    }
    .gst-value {
      color: #059669;
      font-weight: 600;
      background: #d1fae5;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      font-size: 13px;
    }
    
    /* GST Details */
    .gst-section {
      margin: 24px 0;
      padding: 20px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
    }
    .gst-section h5 {
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #bfdbfe;
      font-size: 16px;
      font-weight: 600;
    }
    .gst-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .gst-grid div {
      font-size: 14px;
      color: #4b5563;
    }
    
    /* Items Table */
    .items-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0;
      margin: 32px 0; 
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .items-table th { 
      background: #1f2937; 
      color: white; 
      padding: 14px 16px; 
      text-align: left; 
      font-weight: 500;
      font-size: 14px;
    }
    .items-table td { 
      padding: 12px 16px; 
      border-top: 1px solid #e5e7eb; 
      font-size: 14px;
    }
    .items-table tr:nth-child(even) { background: #f9fafb; }
    .items-table tr:hover { background: #f3f4f6; }
    .items-table th:first-child { width: 60px; }
    .items-table th:nth-child(2) { text-align: left; }
    .items-table td:nth-child(4),
    .items-table td:nth-child(5) { text-align: right; font-weight: 500; }
    
    /* Totals Section */
    .totals-section { 
      margin-top: 40px; 
      padding-top: 24px; 
      border-top: 2px solid #e5e7eb; 
    }
    .total-row { 
      display: flex; 
      justify-content: flex-end; 
      margin-bottom: 10px; 
    }
    .total-label { 
      width: 180px; 
      font-weight: 500; 
      color: #4b5563;
      font-size: 15px;
    }
    .total-value { 
      width: 150px; 
      text-align: right; 
      font-weight: 500; 
      font-size: 15px;
    }
    .grand-total { 
      font-size: 20px; 
      color: #dc2626; 
      margin-top: 20px; 
      padding-top: 16px; 
      border-top: 2px solid #e5e7eb; 
    }
    
    /* Bank Details Section */
    .bank-details {
      margin-top: 40px;
      padding: 20px;
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 8px;
    }
    .bank-details h4 {
      color: #854d0e;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #fde047;
      font-size: 16px;
      font-weight: 600;
    }
    .bank-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .bank-info-item {
      display: flex;
      flex-direction: column;
    }
    .bank-label {
      font-weight: 500;
      color: #854d0e;
      margin-bottom: 4px;
      font-size: 13px;
    }
    .bank-value {
      color: #1f2937;
      font-weight: 600;
      font-size: 14px;
    }
    
    /* Footer */
    .footer-note {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 13px;
      text-align: center;
    }
    .footer-note p {
      margin-bottom: 6px;
    }
    
    /* Print Styles */
    @media print { 
      body { padding: 0; margin: 0; } 
      .invoice-container { border: none; padding: 16px; box-shadow: none; } 
      .no-print { display: none; }
      @page { margin: 0.5cm; }
      .invoice-title { background: #1e40af !important; -webkit-print-color-adjust: exact; }
      .bill-to, .invoice-details { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
      .gst-section { background: #eff6ff !important; -webkit-print-color-adjust: exact; }
      .bank-details { background: #fefce8 !important; -webkit-print-color-adjust: exact; }
    }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="invoice-container">
    <!-- Header with Logo -->
    <div class="company-header">
      <div class="logo-container">
        <img src="${LOGO_PATH}" alt="Company Logo" class="logo">
      </div>
      <div class="company-details">
        <h2>${companyInfo.name}</h2>
        <p>${companyInfo.description}</p>
        <p><span class="highlight">${companyInfo.phone}</span></p>
        <p>${companyInfo.address}</p>
        <div class="gstin">GSTIN: ${companyInfo.gstin}</div>
      </div>
    </div>
    
    <!-- Invoice Title -->
    <div class="invoice-title">TAX INVOICE</div>
    
    <!-- GST Details -->
    <div class="gst-section">
      <h5>GST Details</h5>
      <div class="gst-grid">
        <div>
          <strong>Company GSTIN:</strong> ${companyInfo.gstin}
        </div>
        <div>
          <strong>Customer GSTIN:</strong> ${invoice.customerInfo.gstin || 'Not Provided'}
        </div>
      </div>
    </div>
    
    <!-- Customer Details Grid -->
    <div class="details-grid">
      <div class="bill-to">
        <h4>Bill To</h4>
        <div class="detail-row">
          <div class="detail-label">Customer:</div>
          <div class="detail-value">${invoice.customerInfo.billTo}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Contact No:</div>
          <div class="detail-value">${invoice.customerInfo.contactNo}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">State:</div>
          <div class="detail-value">${invoice.customerInfo.stateName || 'N/A'}</div>
        </div>
        ${invoice.customerInfo.gstin ? `
        <div class="detail-row">
          <div class="detail-label">GSTIN:</div>
          <div class="detail-value">
            <span class="gst-value">${invoice.customerInfo.gstin}</span>
          </div>
        </div>` : ''}
      </div>
      
      <div class="invoice-details">
        <h4>Invoice Details</h4>
        <div class="detail-row">
          <div class="detail-label">Estimate No:</div>
          <div class="detail-value">${invoice.customerInfo.estimateNo}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Estimate Date:</div>
          <div class="detail-value">${invoice.customerInfo.estimateDate}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Branch:</div>
          <div class="detail-value">${companyInfo.branch}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Invoice Date:</div>
          <div class="detail-value">${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Si.No</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate (₹)</th>
          <th>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td>${item.qty}</td>
            <td>${item.rate.toFixed(2)}</td>
            <td>₹${item.amount.toFixed(2)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    
    <!-- Totals Section -->
    <div class="totals-section">
      <div class="total-row">
        <div class="total-label">Sub Total:</div>
        <div class="total-value">₹${invoice.totals.totalAmount.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div class="total-label">CGST (9%):</div>
        <div class="total-value">₹${invoice.totals.cgst.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div class="total-label">SGST (9%):</div>
        <div class="total-value">₹${invoice.totals.sgst.toFixed(2)}</div>
      </div>
      <div class="total-row grand-total">
        <div class="total-label">GRAND TOTAL:</div>
        <div class="total-value">₹${invoice.totals.grandTotal.toFixed(2)}</div>
      </div>
    </div>
    
    <!-- Bank Details Section -->
    <div class="bank-details">
      <h4>Bank Details</h4>
      <div class="bank-info-grid">
        <div class="bank-info-item">
          <span class="bank-label">Account Holder:</span>
          <span class="bank-value">${bankDetails.accountHolder}</span>
        </div>
        <div class="bank-info-item">
          <span class="bank-label">Account Number:</span>
          <span class="bank-value">${bankDetails.accountNumber}</span>
        </div>
        <div class="bank-info-item">
          <span class="bank-label">IFSC Code:</span>
          <span class="bank-value">${bankDetails.ifsc}</span>
        </div>
        <div class="bank-info-item">
          <span class="bank-label">Branch:</span>
          <span class="bank-value">${bankDetails.branch}</span>
        </div>
        <div class="bank-info-item">
          <span class="bank-label">Account Type:</span>
          <span class="bank-value">${bankDetails.accountType}</span>
        </div>
        <div class="bank-info-item">
          <span class="bank-label">Bank Name:</span>
          <span class="bank-value">HDFC BANK</span>
        </div>
      </div>
    </div>
    
    <!-- Footer Note -->
    <div class="footer-note">
      <p>This is a computer generated tax invoice. Valid for accounting purposes.</p>
      <p>For any queries, please contact: ${companyInfo.phone}</p>
      <p>Thank you for your business!</p>
    </div>
  </div>
</body>
</html>`;
  };

  // ================= USE EFFECT =================
  useEffect(() => {
    fetchCompanyInfo();
    fetchQuotations();
  }, []);

  // ================= RENDER =================
  return (
    <div style={{ 
      marginTop: "70px",
      padding: "24px", 
      backgroundColor: "#f8fafc", 
      minHeight: "calc(100vh - 70px)",
      width: "100%" 
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: "24px", 
        padding: "24px", 
        backgroundColor: "white", 
        borderRadius: "12px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Company Logo */}
            <div style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "10px", 
              backgroundColor: "white", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}>
              <img 
                src={LOGO_PATH} 
                alt="Company Logo" 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "contain",
                  padding: "4px"
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml;base64," + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                      <rect width="64" height="64" fill="#1e40af" rx="8"/>
                      <text x="32" y="28" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">SRI RAJA</text>
                      <text x="32" y="40" text-anchor="middle" fill="#e0f2fe" font-family="Arial" font-size="8">MOSQUITO NET</text>
                      <text x="32" y="52" text-anchor="middle" fill="#93c5fd" font-family="Arial" font-size="6">SERVICES</text>
                    </svg>
                  `);
                }}
              />
            </div>
            <div>
              <h3 style={{ color: "#111827", margin: 0, fontSize: "1.5rem", fontWeight: "700" }}>
                <FileText size={24} className="me-2" style={{ verticalAlign: "middle", color: "#1e40af" }} />
                Invoice Generation System
              </h3>
              <p style={{ color: "#6b7280", margin: "6px 0 0 0", fontSize: "0.875rem" }}>
                {companyInfo.name} | GSTIN: {companyInfo.gstin}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button 
              variant="outline-secondary" 
              onClick={() => resetForm()}
              style={{ 
                padding: "8px 16px", 
                fontWeight: "500",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.875rem",
                borderColor: "#d1d5db"
              }}
            >
              <RefreshCw size={16} />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <Container style={{ maxWidth: "1200px", padding: "0" }}>
        {error && (
          <Alert variant="danger" onClose={() => setError("")} dismissible style={{ 
            marginBottom: "20px", 
            borderRadius: "8px",
            border: "1px solid #fca5a5",
            backgroundColor: "#fef2f2"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <X size={20} />
              <span style={{ fontWeight: "500" }}>{error}</span>
            </div>
          </Alert>
        )}
        {success && (
          <Alert variant="success" onClose={() => setSuccess("")} dismissible style={{ 
            marginBottom: "20px", 
            borderRadius: "8px",
            border: "1px solid #86efac",
            backgroundColor: "#f0fdf4"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle size={20} />
              <span style={{ fontWeight: "500" }}>{success}</span>
            </div>
          </Alert>
        )}

        {/* Search Card */}
        <Card style={{ 
          marginBottom: "24px", 
          border: "1px solid #e5e7eb", 
          borderRadius: "12px",
          backgroundColor: "white"
        }}>
          <Card.Body style={{ padding: "24px" }}>
            <h5 style={{ 
              color: "#111827", 
              marginBottom: "20px", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "1.125rem"
            }}>
              <Calculator size={20} style={{ color: "#1e40af" }} />
              Generate Invoice from Quotation
            </h5>
            
            <Row>
              <Col md={8}>
                <Form.Group className="mb-4">
                  <Form.Label style={{ 
                    fontSize: "0.875rem", 
                    fontWeight: "500", 
                    color: "#374151", 
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <FileText size={16} />
                    Enter Quotation Number
                  </Form.Label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <Form.Control
                      type="text"
                      placeholder="Enter quotation number (e.g., 78965 or QTN-78965)"
                      value={quotationNo}
                      onChange={(e) => setQuotationNo(e.target.value)}
                      style={{ 
                        padding: "10px 14px", 
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        border: "1px solid #d1d5db",
                        transition: "all 0.2s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#1e40af"}
                      onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                    />
                    <Button 
                      variant="primary" 
                      onClick={handleSearchQuotation}
                      disabled={loading || !quotationNo.trim()}
                      style={{ 
                        padding: "10px 20px", 
                        borderRadius: "8px", 
                        fontWeight: "500",
                        fontSize: "0.875rem",
                        minWidth: "140px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        backgroundColor: "#1e40af",
                        borderColor: "#1e40af"
                      }}
                    >
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>
                          <Search size={16} />
                          Search Quotation
                        </>
                      )}
                    </Button>
                  </div>
                  <Form.Text style={{ color: "#6b7280", marginTop: "8px", fontSize: "0.75rem" }}>
                    Enter the quotation number or select from the list below
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Quotations List Card */}
        <Card style={{ 
          marginBottom: "24px", 
          border: "1px solid #e5e7eb", 
          borderRadius: "12px",
          backgroundColor: "white"
        }}>
          <Card.Body style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h5 style={{ 
                  color: "#111827", 
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "1.125rem",
                  margin: 0
                }}>
                  <FileText size={20} style={{ color: "#1e40af" }} />
                  Recent Quotations
                </h5>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "4px 0 0 0" }}>
                  Showing {quotations.length} of {totalQuotations} quotations (Page {currentPage} of {totalPages})
                </p>
              </div>
              
              <div style={{ display: "flex", gap: "12px" }}>
                <Form.Control
                  type="text"
                  placeholder="Search by customer name or estimate no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: "280px", 
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    border: "1px solid #d1d5db"
                  }}
                />
                <Button 
                  variant="outline-primary" 
                  onClick={handleSearchQuotations}
                  disabled={quotationsLoading}
                  style={{ 
                    padding: "8px 16px", 
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    borderColor: "#1e40af",
                    color: "#1e40af"
                  }}
                >
                  <Search size={16} />
                  Search
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => {
                    setSearchTerm("");
                    fetchQuotations(1, "");
                  }}
                  style={{ 
                    padding: "8px 16px", 
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "500"
                  }}
                >
                  <RefreshCw size={16} />
                  Refresh
                </Button>
              </div>
            </div>

            {quotationsError && (
              <Alert variant="danger" style={{ 
                marginBottom: "20px", 
                borderRadius: "8px",
                border: "1px solid #fca5a5",
                backgroundColor: "#fef2f2"
              }}>
                {quotationsError}
              </Alert>
            )}

            {quotationsLoading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spinner animation="border" variant="primary" />
                <p style={{ marginTop: "12px", color: "#6b7280", fontSize: "0.875rem" }}>Loading quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                <FileText size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <h5 style={{ color: "#374151", marginBottom: "8px", fontWeight: "500" }}>No quotations found</h5>
                <p style={{ fontSize: "0.875rem" }}>Create a quotation first to generate invoices</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <Table hover responsive style={{ marginBottom: "0", borderCollapse: "separate", borderSpacing: "0" }}>
                    <thead style={{ backgroundColor: "#f8fafc" }}>
                      <tr>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>S.No</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estimate No</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Amount</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                        <th style={{ padding: "12px 16px", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((quotation, index) => (
                        <tr key={quotation.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle", fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>
                            {(currentPage - 1) * perPage + index + 1}
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: "600", color: "#111827", fontSize: "0.875rem" }}>
                              {quotation.customerInfo?.estimateNo || `QTN-${quotation.id}`}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                backgroundColor: "#1e40af",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "600",
                                fontSize: "0.75rem"
                              }}>
                                {quotation.customerInfo?.billTo?.charAt(0) || "C"}
                              </div>
                              <div>
                                <div style={{ fontWeight: "500", color: "#111827", fontSize: "0.875rem" }}>
                                  {quotation.customerInfo?.billTo || "N/A"}
                                </div>
                                {quotation.customerInfo?.stateName && (
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "2px" }}>
                                    <MapPin size={10} style={{ marginRight: "4px" }} />
                                    {quotation.customerInfo.stateName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Phone size={14} style={{ color: "#6b7280" }} />
                              <span style={{ fontWeight: "500", fontSize: "0.875rem" }}>
                                {quotation.customerInfo?.contactNo || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Calendar size={14} style={{ color: "#6b7280" }} />
                              <span style={{ fontSize: "0.875rem" }}>
                                {quotation.customerInfo?.estimateDate || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: "600", color: "#059669", fontSize: "0.875rem" }}>
                              ₹{quotation.totals?.totalAmount?.toFixed(2) || "0.00"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            {quotation.isInvoice ? (
                              <Badge bg="success" style={{ 
                                padding: "4px 8px", 
                                fontSize: "0.75rem", 
                                fontWeight: "500",
                                borderRadius: "6px",
                                backgroundColor: "#059669",
                                border: "none"
                              }}>
                                <FileText size={10} className="me-1" />
                                Invoice
                              </Badge>
                            ) : (
                              <Badge bg="warning" style={{ 
                                padding: "4px 8px", 
                                fontSize: "0.75rem", 
                                fontWeight: "500",
                                borderRadius: "6px",
                                backgroundColor: "#f59e0b",
                                border: "none"
                              }}>
                                Quotation
                              </Badge>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleGenerateFromTable(quotation)}
                                disabled={quotation.isInvoice}
                                style={{ 
                                  padding: "4px 8px", 
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: "#1e40af",
                                  borderColor: "#1e40af",
                                  borderRadius: "6px"
                                }}
                              >
                                <Calculator size={12} />
                                Generate
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Showing {quotations.length} quotations on page {currentPage} of {totalPages}
                    </div>
                    <Pagination style={{ margin: "0" }}>
                      <Pagination.Prev 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1}
                        style={{ padding: "8px 12px", fontSize: "0.875rem" }}
                      />
                      {[...Array(totalPages)].slice(0, 5).map((_, i) => (
                        <Pagination.Item
                          key={i + 1}
                          active={i + 1 === currentPage}
                          onClick={() => handlePageChange(i + 1)}
                          style={{ 
                            padding: "8px 12px", 
                            fontSize: "0.875rem",
                            border: "1px solid #d1d5db"
                          }}
                        >
                          {i + 1}
                        </Pagination.Item>
                      ))}
                      {totalPages > 5 && (
                        <>
                          <Pagination.Ellipsis />
                          <Pagination.Item
                            active={currentPage === totalPages}
                            onClick={() => handlePageChange(totalPages)}
                            style={{ 
                              padding: "8px 12px", 
                              fontSize: "0.875rem",
                              border: "1px solid #d1d5db"
                            }}
                          >
                            {totalPages}
                          </Pagination.Item>
                        </>
                      )}
                      <Pagination.Next 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                        style={{ padding: "8px 12px", fontSize: "0.875rem" }}
                      />
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* GST Entry Modal */}
      <Modal 
        show={showGstModal} 
        onHide={() => setShowGstModal(false)}
        centered
        backdrop="static"
        size="md"
      >
        <Modal.Header closeButton style={{ 
          borderBottom: "1px solid #e5e7eb", 
          backgroundColor: "white",
          padding: "16px 24px",
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px"
        }}>
          <Modal.Title style={{ fontSize: "1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px", color: "#111827" }}>
            <Calculator size={18} style={{ color: "#1e40af" }} />
            Enter GST Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "24px" }}>
          <Alert variant="info" style={{ 
            marginBottom: "20px", 
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
            backgroundColor: "#eff6ff"
          }}>
            <strong>Quotation Number:</strong> {quotationNo}<br />
            Please enter customer's GSTIN to generate tax invoice
          </Alert>
          
          <Form.Group>
            <Form.Label style={{ 
              fontSize: "0.875rem", 
              fontWeight: "500", 
              color: "#374151", 
              marginBottom: "8px" 
            }}>
              Customer GSTIN <span style={{ color: "#dc2626" }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter 15-digit GSTIN (e.g., 33BECPR927M1ZU)"
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
              style={{ 
                padding: "10px 12px", 
                borderRadius: "8px",
                fontSize: "0.875rem",
                border: "1px solid #d1d5db"
              }}
              maxLength={15}
            />
            <Form.Text style={{ color: "#6b7280", marginTop: "8px", fontSize: "0.75rem" }}>
              GSTIN format: 2 state code + 10 PAN + 3 entity code
            </Form.Text>
          </Form.Group>
          
          <div style={{ 
            backgroundColor: "#f8fafc", 
            padding: "16px", 
            borderRadius: "8px", 
            marginTop: "20px",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ 
                width: "20px", 
                height: "20px", 
                borderRadius: "50%", 
                backgroundColor: "#059669", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: "bold"
              }}>
                ₹
              </div>
              <span style={{ color: "#374151", fontWeight: "500", fontSize: "0.875rem" }}>GST Calculation Preview</span>
            </div>
            <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>
              System will automatically calculate 18% GST (9% CGST + 9% SGST) on the quotation total
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "1px solid #e5e7eb", padding: "16px 24px" }}>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowGstModal(false)}
            style={{ 
              padding: "8px 16px", 
              borderRadius: "8px", 
              fontWeight: "500",
              fontSize: "0.875rem"
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitGst}
            disabled={!customerGstin.trim() || customerGstin.length < 15}
            style={{ 
              padding: "8px 20px", 
              borderRadius: "8px", 
              fontWeight: "500",
              fontSize: "0.875rem",
              backgroundColor: "#1e40af",
              borderColor: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Calculator size={14} />
            Calculate & Generate
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal 
        show={showInvoiceModal} 
        onHide={() => setShowInvoiceModal(false)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton style={{ 
          borderBottom: "1px solid #e5e7eb", 
          backgroundColor: "white",
          padding: "16px 24px"
        }}>
          <Modal.Title style={{ fontSize: "1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px", color: "#111827" }}>
            <FileText size={18} style={{ color: "#1e40af" }} />
            Invoice Preview - {invoiceData?.customerInfo?.estimateNo || invoiceData?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto", padding: "24px" }}>
          {invoiceData && (
            <div>
              {/* Invoice Header */}
              <div style={{ 
                backgroundColor: "#f8fafc", 
                padding: "20px", 
                borderRadius: "8px", 
                marginBottom: "20px",
                border: "1px solid #e5e7eb"
              }}>
                <Row>
                  <Col md={6}>
                    <div style={{ marginBottom: "15px" }}>
                      <h6 style={{ 
                        color: "#374151", 
                        marginBottom: "10px", 
                        fontSize: "0.875rem", 
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <User size={14} />
                        Bill To
                      </h6>
                      <div style={{ 
                        color: "#111827", 
                        fontWeight: "600", 
                        fontSize: "1rem",
                        marginBottom: "8px"
                      }}>
                        {invoiceData.customerInfo.billTo}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "4px" }}>
                        <Phone size={12} style={{ marginRight: "6px" }} />
                        {invoiceData.customerInfo.contactNo}
                      </div>
                      {invoiceData.customerInfo.stateName && (
                        <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "4px" }}>
                          <MapPin size={12} style={{ marginRight: "6px" }} />
                          {invoiceData.customerInfo.stateName}
                        </div>
                      )}
                      {invoiceData.customerInfo.gstin && (
                        <div style={{ 
                          backgroundColor: "#059669", 
                          color: "white", 
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          display: "inline-flex", 
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "8px",
                          fontSize: "0.75rem",
                          fontWeight: "500"
                        }}>
                          <FileText size={10} />
                          GSTIN: {invoiceData.customerInfo.gstin}
                        </div>
                      )}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ marginBottom: "15px" }}>
                      <h6 style={{ 
                        color: "#374151", 
                        marginBottom: "10px", 
                        fontSize: "0.875rem", 
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <Calendar size={14} />
                        Invoice Details
                      </h6>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "2px" }}>Estimate No</div>
                          <div style={{ color: "#111827", fontWeight: "600", fontSize: "0.875rem" }}>{invoiceData.customerInfo.estimateNo || invoiceData.id}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "2px" }}>Estimate Date</div>
                          <div style={{ color: "#111827", fontWeight: "500", fontSize: "0.875rem" }}>{invoiceData.customerInfo.estimateDate || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "2px" }}>Branch</div>
                          <div style={{ color: "#111827", fontWeight: "500", fontSize: "0.875rem" }}>{companyInfo.branch}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "2px" }}>Invoice Date</div>
                          <div style={{ color: "#111827", fontWeight: "500", fontSize: "0.875rem" }}>{new Date().toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: "25px" }}>
                <h6 style={{ 
                  color: "#374151", 
                  marginBottom: "12px", 
                  fontSize: "0.875rem", 
                  fontWeight: "600", 
                  paddingBottom: "8px", 
                  borderBottom: "1px solid #e5e7eb" 
                }}>
                  Items
                </h6>
                <Table bordered hover size="sm" style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                  <thead style={{ backgroundColor: "#f8fafc" }}>
                    <tr>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#374151", fontWeight: "600", width: "50px", borderBottom: "1px solid #e5e7eb" }}>S.No</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#374151", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>Description</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#374151", fontWeight: "600", width: "80px", borderBottom: "1px solid #e5e7eb" }}>Qty</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#374151", fontWeight: "600", width: "100px", borderBottom: "1px solid #e5e7eb" }}>Rate (₹)</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#374151", fontWeight: "600", width: "100px", borderBottom: "1px solid #e5e7eb" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items && invoiceData.items.length > 0 ? (
                      invoiceData.items.map((item, i) => (
                        <tr key={i}>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#6b7280", fontWeight: "500", verticalAlign: "middle", fontSize: "0.875rem" }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: "10px 12px", verticalAlign: "middle", fontSize: "0.875rem" }}>
                            {item.description}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle", fontSize: "0.875rem" }}>
                            {item.qty}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", verticalAlign: "middle", fontSize: "0.875rem" }}>
                            ₹{item.rate ? item.rate.toFixed(2) : "0.00"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#059669", fontWeight: "600", verticalAlign: "middle", fontSize: "0.875rem" }}>
                            ₹{item.amount ? item.amount.toFixed(2) : "0.00"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#6b7280", fontSize: "0.875rem" }}>
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* GST Calculations */}
              <div style={{ 
                backgroundColor: "#eff6ff", 
                padding: "20px", 
                borderRadius: "8px", 
                marginBottom: "25px",
                border: "1px solid #bfdbfe"
              }}>
                <h6 style={{ 
                  color: "#1e40af", 
                  marginBottom: "12px", 
                  fontSize: "0.875rem", 
                  fontWeight: "600", 
                  paddingBottom: "8px", 
                  borderBottom: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Calculator size={14} />
                  GST Calculation (18%)
                </h6>
                <Row>
                  <Col md={6}>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>Sub Total:</span>
                        <span style={{ color: "#374151", fontWeight: "500", fontSize: "0.875rem" }}>₹{invoiceData.totals.totalAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>CGST (9%):</span>
                        <span style={{ color: "#059669", fontWeight: "500", fontSize: "0.875rem" }}>₹{invoiceData.totals.cgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>SGST (9%):</span>
                        <span style={{ color: "#059669", fontWeight: "500", fontSize: "0.875rem" }}>₹{invoiceData.totals.sgst.toFixed(2)}</span>
                      </div>
                      <hr style={{ margin: "10px 0", borderColor: "#bfdbfe" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                        <h6 style={{ color: "#111827", margin: 0, fontWeight: "600", fontSize: "1rem" }}>Grand Total:</h6>
                        <h5 style={{ color: '#dc2626', margin: 0, fontWeight: "600", fontSize: "1.125rem" }}>
                          ₹{invoiceData.totals.grandTotal.toFixed(2)}
                        </h5>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      backgroundColor: "white", 
                      padding: "16px", 
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <h6 style={{ color: "#374151", marginBottom: "8px", fontSize: "0.875rem", fontWeight: "600" }}>GST Summary</h6>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span>Taxable Value:</span>
                          <span>₹{invoiceData.totals.totalAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span>Total GST (18%):</span>
                          <span>₹{(invoiceData.totals.cgst + invoiceData.totals.sgst).toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span>Invoice Total:</span>
                          <span style={{ fontWeight: "600", color: "#111827" }}>₹{invoiceData.totals.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "1px solid #e5e7eb", padding: "16px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowInvoiceModal(false)}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: "8px", 
                  fontWeight: "500",
                  fontSize: "0.875rem"
                }}
              >
                Close
              </Button>
              {invoiceData?.customerInfo?.contactNo && (
                <Button 
                  variant="outline-success"
                  onClick={handleWhatsappShare}
                  style={{ 
                    padding: "8px 16px", 
                    borderRadius: "8px", 
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    borderColor: "#059669",
                    color: "#059669"
                  }}
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </Button>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <Button 
                variant="outline-warning" 
                onClick={handleDownload}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: "8px", 
                  fontWeight: "500",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderColor: "#f59e0b",
                  color: "#f59e0b"
                }}
              >
                <Download size={14} />
                Download
              </Button>
              <Button 
                variant="outline-primary" 
                onClick={handlePrint}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: "8px", 
                  fontWeight: "500",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderColor: "#1e40af",
                  color: "#1e40af"
                }}
              >
                <Printer size={14} />
                Print
              </Button>
              <Button 
                variant="success" 
                onClick={saveInvoiceWithGst}
                disabled={saving}
                style={{ 
                  padding: "8px 20px", 
                  borderRadius: "8px", 
                  fontWeight: "500",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#059669",
                  borderColor: "#059669"
                }}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {/* WhatsApp Message Modal */}
      <Modal 
        show={showWhatsappModal} 
        onHide={() => setShowWhatsappModal(false)}
        centered
        size="md"
      >
        <Modal.Header closeButton style={{ 
          borderBottom: "1px solid #e5e7eb", 
          backgroundColor: "white",
          padding: "16px 24px"
        }}>
          <Modal.Title style={{ fontSize: "1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px", color: "#111827" }}>
            <MessageCircle size={18} style={{ color: "#25D366" }} />
            Send WhatsApp Message
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "24px" }}>
          <Alert variant="info" style={{ 
            marginBottom: "20px", 
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
            backgroundColor: "#eff6ff",
            fontSize: "0.875rem"
          }}>
            <strong>Recipient:</strong> {invoiceData?.customerInfo?.billTo}<br />
            <strong>Phone:</strong> {invoiceData?.customerInfo?.contactNo}
          </Alert>
          
          <Form.Group>
            <Form.Label style={{ 
              fontSize: "0.875rem", 
              fontWeight: "500", 
              color: "#374151", 
              marginBottom: "8px" 
            }}>
              Message to send
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              style={{ 
                padding: "12px", 
                borderRadius: "8px",
                fontSize: "0.875rem",
                border: "1px solid #d1d5db",
                resize: "vertical"
              }}
            />
            <Form.Text style={{ color: "#6b7280", marginTop: "8px", fontSize: "0.75rem" }}>
              This message will be sent via WhatsApp to the customer's phone number
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "1px solid #e5e7eb", padding: "16px 24px" }}>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowWhatsappModal(false)}
            style={{ 
              padding: "8px 16px", 
              borderRadius: "8px", 
              fontWeight: "500",
              fontSize: "0.875rem"
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={sendWhatsappMessage}
            style={{ 
              padding: "8px 20px", 
              borderRadius: "8px", 
              fontWeight: "500",
              fontSize: "0.875rem",
              backgroundColor: "#25D366",
              borderColor: "#25D366",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <MessageCircle size={14} />
            Send via WhatsApp
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InvoicePage;