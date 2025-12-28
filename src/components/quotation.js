import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Row, Col, Spinner, Alert, Pagination } from "react-bootstrap";
import { Printer, Download, MessageCircle, FileText, PlusCircle, Trash2, Edit, QuoteIcon, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from "lucide-react";

// API Base URL
const API_BASE_URL = "http://localhost:5000/api";

const QuotationPage = () => {
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
  const [customerInfo, setCustomerInfo] = useState({
    billTo: "",
    stateName: "",
    contactNo: "",
    estimateNo: "",
    estimateDate: "",
  });

  const [items, setItems] = useState([
    { description: "", qty: 1, rate: 0, amount: 0 }
  ]);
  
  const [quotations, setQuotations] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({
    total_quotations: 0,
    total_value: 0,
    this_month: 0,
    growth_percentage: 0
  });

  // ================= PAGINATION STATE =================
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10, // Fixed to 10 items per page
  });

  // ================= CALCULATIONS =================
  const totalAmount = items.reduce((a, b) => a + b.amount, 0);

  // ================= API FUNCTIONS =================
  const fetchQuotations = async (page = 1, perPage = 10) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/quotations?page=${page}&per_page=${perPage}`);
      if (!response.ok) throw new Error('Failed to fetch quotations');
      const data = await response.json();
      setQuotations(data.quotations);
      setStats(data.stats || {});
      
      // Update pagination state
      if (data.pagination) {
        setPagination({
          currentPage: data.pagination.page,
          totalPages: data.pagination.pages,
          totalItems: data.pagination.total,
          itemsPerPage: 10, // Fixed to 10
        });
      }
    } catch (err) {
      setError(`Error fetching quotations: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  // ================= HANDLERS =================
  const handleCustomerChange = (e) =>
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });

  const handleItemChange = (i, field, value) => {
    const data = [...items];
    data[i][field] = field === "description" ? value : Number(value);
    // Auto-calculate amount
    if (field === "qty" || field === "rate") {
      data[i].amount = data[i].qty * data[i].rate;
    }
    setItems(data);
  };

  const addItem = () =>
    setItems([...items, { description: "", qty: 1, rate: 0, amount: 0 }]);

  const removeItem = (i) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== i));
    }
  };

  // ================= PAGINATION HANDLERS =================
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages && page !== pagination.currentPage) {
      fetchQuotations(page);
    }
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const { currentPage, totalPages } = pagination;
    
    // Always show first page
    items.push(
      <Pagination.Item 
        key={1} 
        active={1 === currentPage}
        onClick={() => handlePageChange(1)}
      >
        1
      </Pagination.Item>
    );

    // Show ellipsis if needed
    if (currentPage > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis-start" />);
    }

    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i !== 1 && i !== totalPages) {
        items.push(
          <Pagination.Item 
            key={i} 
            active={i === currentPage}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </Pagination.Item>
        );
      }
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis-end" />);
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
      items.push(
        <Pagination.Item 
          key={totalPages} 
          active={totalPages === currentPage}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    return items;
  };

  // ================= SAVE QUOTATION =================
  const handleSave = async () => {
    // Validate required fields
    if (!customerInfo.billTo.trim()) {
      setError("Customer name is required");
      return;
    }
    if (!customerInfo.contactNo.trim()) {
      setError("Contact number is required");
      return;
    }
    if (items.some(item => !item.description.trim())) {
      setError("All items must have a description");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    // Format estimateDate properly for backend
    const formattedCustomerInfo = {
      ...customerInfo,
      estimateDate: customerInfo.estimateDate || null
    };

    const quotationData = {
      customerInfo: formattedCustomerInfo,
      items: items.map(item => ({
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount
      })),
      totals: { 
        totalAmount
      }
    };

    try {
      let response;
      if (editId) {
        // Update existing quotation
        response = await fetch(`${API_BASE_URL}/quotations/${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quotationData),
        });
      } else {
        // Create new quotation
        response = await fetch(`${API_BASE_URL}/quotations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quotationData),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.errors?.join(', ') || 'Failed to save quotation');
      }

      setSuccess(editId ? "Quotation updated successfully!" : "Quotation created successfully!");
      
      // Refresh the quotations list
      await fetchQuotations(pagination.currentPage);
      
      // Close modal and reset form after a short delay
      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 1000);

    } catch (err) {
      setError(`Error saving quotation: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCustomerInfo({
      billTo: "",
      stateName: "",
      contactNo: "",
      estimateNo: "",
      estimateDate: "",
    });
    setItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);
    setEditId(null);
    setError("");
    setSuccess("");
  };

  // ================= VIEW QUOTATION =================
  const handleView = (quote) => {
    setSelectedQuotation(quote);
    setShowViewModal(true);
  };

  // ================= EDIT =================
  const handleEdit = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/quotations/${id}`);
      if (!response.ok) throw new Error('Failed to fetch quotation');
      const quote = await response.json();
      
      setCustomerInfo({
        billTo: quote.customerInfo.billTo || "",
        stateName: quote.customerInfo.stateName || "",
        contactNo: quote.customerInfo.contactNo || "",
        estimateNo: quote.customerInfo.estimateNo || "",
        estimateDate: quote.customerInfo.estimateDate || "",
      });
      setItems(quote.items.map(item => ({
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount
      })));
      setEditId(id);
      setShowModal(true);
    } catch (err) {
      setError(`Error loading quotation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/quotations/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete quotation');
        
        setSuccess("Quotation deleted successfully!");
        await fetchQuotations(pagination.currentPage);
      } catch (err) {
        setError(`Error deleting quotation: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // ================= DOWNLOAD AS HTML =================
  const handleDownload = (quote) => {
    const html = generateQuotationHTML(quote);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quotation_${quote.customerInfo.estimateNo || quote.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ================= PRINT =================
  const handlePrint = (quote) => {
    const html = generateQuotationHTML(quote);
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

  const generateQuotationHTML = (quote) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quotation ${quote.customerInfo.estimateNo || quote.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background: #fff; }
    .quotation-container { max-width: 850px; margin: 0 auto; border: 2px solid #000; padding: 25px; background: white; }
    
    /* Header Section */
    .company-header { display: flex; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000; }
    .logo-container { flex: 0 0 120px; margin-right: 25px; }
    .logo { width: 120px; height: 120px; object-fit: contain; }
    .company-details { flex: 1; }
    .company-details h2 { color: #2c3e50; margin-bottom: 8px; font-size: 24px; font-weight: bold; }
    .company-details p { margin-bottom: 4px; color: #555; }
    .highlight { color: #e74c3c; font-weight: bold; }
    
    /* Quotation Title */
    .quotation-title { 
      text-align: center; 
      margin: 25px 0; 
      padding: 12px; 
      background: #f8f9fa; 
      border-top: 2px solid #000; 
      border-bottom: 2px solid #000; 
      font-size: 24px; 
      font-weight: bold; 
      color: #2c3e50; 
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Details Section */
    .details-grid { 
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px;
      margin-bottom: 30px;
    }
    .bill-to, .customer-details { 
      padding: 18px; 
      background: #f8f9fa; 
      border: 1px solid #ddd; 
      border-radius: 6px;
    }
    .bill-to h4, .customer-details h4 { 
      color: #2c3e50; 
      margin-bottom: 12px; 
      padding-bottom: 6px; 
      border-bottom: 1px solid #ccc; 
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
    }
    .detail-label {
      flex: 0 0 120px;
      font-weight: 600;
      color: #495057;
    }
    .detail-value {
      flex: 1;
      color: #2c3e50;
    }
    
    /* Items Table */
    .items-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 30px 0; 
    }
    .items-table th { 
      background: #2c3e50; 
      color: white; 
      padding: 14px; 
      text-align: center; 
      border: 1px solid #000; 
      font-weight: 600;
    }
    .items-table td { 
      padding: 12px; 
      border: 1px solid #ddd; 
      text-align: center;
    }
    .items-table tr:nth-child(even) { background: #f8f9fa; }
    .items-table td:first-child { width: 60px; }
    .items-table td:nth-child(2) { text-align: left; }
    .items-table td:nth-child(4),
    .items-table td:nth-child(5) { text-align: right; }
    
    /* Totals Section */
    .totals-section { 
      margin-top: 35px; 
      padding-top: 20px; 
      border-top: 2px solid #000; 
    }
    .total-row { 
      display: flex; 
      justify-content: flex-end; 
      margin-bottom: 10px; 
    }
    .total-label { 
      width: 180px; 
      font-weight: 600; 
      color: #495057;
    }
    .total-value { 
      width: 180px; 
      text-align: right; 
      font-weight: bold; 
    }
    .total-row { 
      font-size: 22px; 
      color: #2c3e50; 
      margin-top: 20px; 
      padding-top: 15px; 
      border-top: 2px solid #000; 
    }
    
    /* Bank Details Section */
    .bank-details {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 6px;
      border-left: 4px solid #2c3e50;
    }
    .bank-details h4 {
      color: #2c3e50;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ccc;
    }
    .bank-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .bank-info-item {
      display: flex;
      flex-direction: column;
    }
    .bank-label {
      font-weight: 600;
      color: #495057;
      margin-bottom: 4px;
      font-size: 0.95rem;
    }
    .bank-value {
      color: #2c3e50;
      font-weight: bold;
      font-size: 1.05rem;
    }
    
    /* Footer */
    .footer-note {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px dashed #ccc;
      color: #666;
      font-size: 0.9rem;
      text-align: center;
    }
    
    /* Print Styles */
    @media print { 
      body { padding: 0; margin: 0; } 
      .quotation-container { border: none; padding: 15px; } 
      .no-print { display: none; }
      @page { margin: 0.5cm; }
    }
  </style>
</head>
<body>
  <div class="quotation-container">
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
      </div>
    </div>
    
    <!-- Quotation Title -->
    <div class="quotation-title">QUOTATION</div>
    
    <!-- Customer Details Grid -->
    <div class="details-grid">
      <div class="bill-to">
        <h4>Customer Details</h4>
        <div class="detail-row">
          <div class="detail-label">Bill To:</div>
          <div class="detail-value">${quote.customerInfo.billTo}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Contact No:</div>
          <div class="detail-value">${quote.customerInfo.contactNo}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">State Name:</div>
          <div class="detail-value">${quote.customerInfo.stateName || 'N/A'}</div>
        </div>
      </div>
      
      <div class="customer-details">
        <h4>Additional Details</h4>
        <div class="detail-row">
          <div class="detail-label">Estimate No:</div>
          <div class="detail-value">${quote.customerInfo.estimateNo || 'N/A'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Estimate Date:</div>
          <div class="detail-value">${quote.customerInfo.estimateDate || 'N/A'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Branch:</div>
          <div class="detail-value">${companyInfo.branch}</div>
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
        ${quote.items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td>${item.qty}</td>
            <td>${item.rate.toFixed(2)}</td>
            <td>${item.amount.toFixed(2)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    
    <!-- Totals Section -->
    <div class="totals-section">
      <div class="total-row">
        <div class="total-label">TOTAL AMOUNT:</div>
        <div class="total-value">₹${quote.totals.totalAmount.toFixed(2)}</div>
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
      <p>This is a computer generated quotation. Valid for 30 days from date of issue.</p>
      <p>For any queries, please contact: ${companyInfo.phone}</p>
    </div>
  </div>
</body>
</html>`;
  };

  // ================= WHATSAPP =================
  const sendWhatsApp = (quote) => {
    const msg = `Quotation ${quote.customerInfo.estimateNo || quote.id}
Customer: ${quote.customerInfo.billTo}
Total Amount: ₹${quote.totals.totalAmount.toFixed(2)}
Date: ${quote.quotationDate}
Thank you for your business!`;
    
    window.open(`https://wa.me/91${quote.customerInfo.contactNo}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ================= USE EFFECT =================
  useEffect(() => {
    fetchQuotations();
    fetchCompanyInfo();
  }, []);

  // ================= RENDER =================
  return (
    <div style={{ 
      marginTop: "70px", // Fixed header height
      padding: "20px", 
      backgroundColor: "#f8f9fa", 
      minHeight: "calc(100vh - 70px)", // Subtract header height
      width: "100%" 
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: "20px", 
        padding: "20px", 
        backgroundColor: "white", 
        borderRadius: "8px", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Company Logo */}
            <div style={{ 
              width: "80px", 
              height: "80px", 
              borderRadius: "10px", 
              backgroundColor: "white", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}>
              <img 
                src={LOGO_PATH} 
                alt="Company Logo" 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "contain",
                  padding: "5px"
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml;base64," + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
                      <rect width="80" height="80" fill="#2c3e50" rx="10"/>
                      <text x="40" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">SRI RAJA</text>
                      <text x="40" y="50" text-anchor="middle" fill="#ecf0f1" font-family="Arial" font-size="10">MOSQUITO NET</text>
                      <text x="40" y="65" text-anchor="middle" fill="#bdc3c7" font-family="Arial" font-size="8">SERVICES</text>
                    </svg>
                  `);
                }}
              />
            </div>
            <div>
              <h3 style={{ color: "white", margin: 0, fontSize: "1.8rem", fontWeight: "bold" }}>
                <QuoteIcon size={28} className="me-2" style={{ verticalAlign: "middle" }} />
                Quotation Management System
              </h3>
              <p style={{ color: "rgba(255,255,255,0.9)", margin: "8px 0 0 0", fontSize: "1rem" }}>
                {companyInfo.name} | {companyInfo.phone}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button 
              variant="outline-light" 
              onClick={() => fetchQuotations(pagination.currentPage)}
              disabled={loading}
              style={{ 
                padding: "10px 20px", 
                fontWeight: "600",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <RefreshCw size={18} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible style={{ marginBottom: "20px" }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess("")} dismissible style={{ marginBottom: "20px" }}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "15px", 
        marginBottom: "20px" 
      }}>
        <div style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          borderRadius: "8px", 
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          borderLeft: "4px solid #007bff"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h6 style={{ color: "#6c757d", margin: 0, fontSize: "0.9rem", fontWeight: "600" }}>Total Quotations</h6>
              <h3 style={{ color: "#2c3e50", margin: "8px 0 0 0", fontWeight: "700" }}>
                {loading ? <Spinner animation="border" size="sm" /> : pagination.totalItems}
              </h3>
            </div>
            <div style={{ 
              width: "50px", 
              height: "50px", 
              borderRadius: "50%", 
              backgroundColor: "rgba(0,123,255,0.1)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#007bff"
            }}>
              <FileText size={24} />
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          borderRadius: "8px", 
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          borderLeft: "4px solid #28a745"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h6 style={{ color: "#6c757d", margin: 0, fontSize: "0.9rem", fontWeight: "600" }}>Total Value</h6>
              <h3 style={{ color: "#28a745", margin: "8px 0 0 0", fontWeight: "700" }}>
                {loading ? <Spinner animation="border" size="sm" /> : `₹${(stats.total_value || 0).toFixed(2)}`}
              </h3>
            </div>
            <div style={{ 
              width: "50px", 
              height: "50px", 
              borderRadius: "50%", 
              backgroundColor: "rgba(40,167,69,0.1)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#28a745"
            }}>
              ₹
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          borderRadius: "8px", 
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          borderLeft: "4px solid #ffc107"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h6 style={{ color: "#6c757d", margin: 0, fontSize: "0.9rem", fontWeight: "600" }}>This Month</h6>
              <h3 style={{ color: "#ffc107", margin: "8px 0 0 0", fontWeight: "700" }}>
                {loading ? <Spinner animation="border" size="sm" /> : (stats.this_month || 0)}
              </h3>
              {stats.growth_percentage !== 0 && (
                <small style={{ color: stats.growth_percentage > 0 ? "#28a745" : "#dc3545" }}>
                  {stats.growth_percentage > 0 ? "↑" : "↓"} {Math.abs(stats.growth_percentage)}% from last month
                </small>
              )}
            </div>
            <div style={{ 
              width: "50px", 
              height: "50px", 
              borderRadius: "50%", 
              backgroundColor: "rgba(255,193,7,0.1)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#ffc107"
            }}>
              <FileText size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div style={{ 
        backgroundColor: "white", 
        borderRadius: "8px", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)", 
        overflow: "hidden",
        marginBottom: "20px"
      }}>
        <div style={{ 
          padding: "20px", 
          borderBottom: "1px solid #e0e0e0", 
          backgroundColor: "#f8f9fa",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h5 style={{ 
            color: "#2c3e50", 
            margin: 0, 
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <FileText size={20} />
            Recent Quotations
            {loading && <Spinner animation="border" size="sm" />}
          </h5>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ 
              backgroundColor: "#007bff", 
              color: "white", 
              padding: "4px 12px", 
              borderRadius: "12px", 
              fontSize: "0.85rem", 
              fontWeight: "500" 
            }}>
              Showing {quotations.length} of {pagination.totalItems} quotations
            </span>
            <Button 
              size="sm" 
              variant="outline-primary"
              onClick={() => setShowModal(true)}
              style={{ 
                padding: "4px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <PlusCircle size={16} />
              New
            </Button>
          </div>
        </div>
        
        {/* Pagination Controls - Top */}
        <div style={{ 
          padding: "15px 20px", 
          borderBottom: "1px solid #e0e0e0", 
          backgroundColor: "#f8f9fa",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#6c757d", fontSize: "0.9rem" }}>10 items per page</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={{ color: "#6c757d", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
              Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalItems} total items
            </span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={pagination.currentPage === 1 || loading}
                style={{ padding: "4px 8px" }}
                title="First page"
              >
                <ChevronsLeft size={16} />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                style={{ padding: "4px 8px" }}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <div style={{ display: "flex" }}>
                <Pagination style={{ margin: 0 }}>
                  {renderPaginationItems()}
                </Pagination>
              </div>
              
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                style={{ padding: "4px 8px" }}
                title="Next page"
              >
                <ChevronRight size={16} />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                style={{ padding: "4px 8px" }}
                title="Last page"
              >
                <ChevronsRight size={16} />
              </Button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Spinner animation="border" variant="primary" />
            <p style={{ marginTop: "10px", color: "#6c757d" }}>Loading quotations...</p>
          </div>
        ) : quotations.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <Table hover responsive style={{ margin: 0 }}>
              <thead style={{ backgroundColor: "#f8f9fa" }}>
                <tr>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600", width: "60px" }}>#</th>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600" }}>Quotation No</th>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600" }}>Customer</th>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600" }}>Contact</th>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600" }}>Estimate No</th>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600" }}>Total Amount</th>
                  <th style={{ padding: "12px 15px", borderBottom: "1px solid #e0e0e0", color: "#495057", fontWeight: "600", width: "280px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quote, i) => (
                  <tr key={quote.id} style={{ 
                    borderBottom: "1px solid #f0f0f0", 
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa"
                  }}>
                    <td style={{ padding: "12px 15px", color: "#6c757d", fontWeight: "500" }}>
                      {(pagination.currentPage - 1) * pagination.itemsPerPage + i + 1}
                    </td>
                    <td style={{ padding: "12px 15px", color: "#007bff", fontWeight: "600" }}>
                      Q-{quote.id}
                    </td>
                    <td style={{ padding: "12px 15px" }}>
                      <strong style={{ color: "#2c3e50" }}>{quote.customerInfo.billTo}</strong>
                      {quote.customerInfo.stateName && (
                        <div style={{ color: "#6c757d", fontSize: "0.85rem", marginTop: "2px" }}>
                          {quote.customerInfo.stateName}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 15px", color: "#6c757d", fontWeight: "500" }}>
                      {quote.customerInfo.contactNo}
                    </td>
                    <td style={{ padding: "12px 15px", color: "#6c757d", fontWeight: "500" }}>
                      {quote.customerInfo.estimateNo || "N/A"}
                      {quote.customerInfo.estimateDate && (
                        <div style={{ color: "#6c757d", fontSize: "0.8rem", marginTop: "2px" }}>
                          {quote.customerInfo.estimateDate}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 15px" }}>
                      <strong style={{ color: "#28a745", fontSize: "1.1rem", fontWeight: "600" }}>
                        ₹{quote.totals.totalAmount.toFixed(2)}
                      </strong>
                    </td>
                    <td style={{ padding: "12px 15px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Button 
                          size="sm" 
                          variant="outline-info" 
                          onClick={() => handleView(quote)}
                          title="View"
                          style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            borderWidth: "1px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Eye size={16} />
                          <span style={{ fontSize: "0.8rem" }}>View</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-primary" 
                          onClick={() => handlePrint(quote)}
                          title="Print"
                          style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            borderWidth: "1px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Printer size={16} />
                          <span style={{ fontSize: "0.8rem" }}>Print</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-success" 
                          onClick={() => handleDownload(quote)}
                          title="Download"
                          style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            borderWidth: "1px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Download size={16} />
                          <span style={{ fontSize: "0.8rem" }}>Download</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-warning" 
                          onClick={() => handleEdit(quote.id)}
                          title="Edit"
                          style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            borderWidth: "1px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Edit size={16} />
                          <span style={{ fontSize: "0.8rem" }}>Edit</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-danger" 
                          onClick={() => handleDelete(quote.id)}
                          title="Delete"
                          style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            borderWidth: "1px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Trash2 size={16} />
                          <span style={{ fontSize: "0.8rem" }}>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div style={{ 
            textAlign: "center", 
            padding: "80px 20px", 
            backgroundColor: "white"
          }}>
            <div style={{ 
              width: "100px", 
              height: "100px", 
              borderRadius: "50%", 
              backgroundColor: "#f8f9fa", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center",
              marginBottom: "20px"
            }}>
              <QuoteIcon size={48} style={{ color: "#dee2e6" }} />
            </div>
            <h5 style={{ color: "#6c757d", marginBottom: "10px", fontWeight: "600" }}>No quotations yet</h5>
            <p style={{ color: "#adb5bd", marginBottom: "20px", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
              Start by creating your first quotation. It will appear here once saved.
            </p>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
              style={{ 
                padding: "10px 24px", 
                borderRadius: "6px", 
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto"
              }}
            >
              <PlusCircle size={18} />
              Create First Quotation
            </Button>
          </div>
        )}
        
        {/* Pagination Controls - Bottom */}
        {quotations.length > 0 && (
          <div style={{ 
            padding: "15px 20px", 
            borderTop: "1px solid #e0e0e0", 
            backgroundColor: "#f8f9fa",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={pagination.currentPage === 1 || loading}
                style={{ padding: "4px 8px" }}
                title="First page"
              >
                <ChevronsLeft size={16} />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                style={{ padding: "4px 8px" }}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <span style={{ color: "#6c757d", fontSize: "0.9rem", margin: "0 10px" }}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                style={{ padding: "4px 8px" }}
                title="Next page"
              >
                <ChevronRight size={16} />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                style={{ padding: "4px 8px" }}
                title="Last page"
              >
                <ChevronsRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Quotation Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton style={{ 
          borderBottom: "1px solid #e0e0e0", 
          backgroundColor: "#17a2b8", 
          color: "white",
          padding: "15px 25px"
        }}>
          <Modal.Title style={{ fontSize: "1.2rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
            <Eye size={20} />
            View Quotation: {selectedQuotation?.customerInfo.estimateNo || selectedQuotation?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto", padding: "25px" }}>
          {selectedQuotation && (
            <div>
              <div style={{ marginBottom: "25px" }}>
                <h6 style={{ color: "#495057", marginBottom: "15px", fontSize: "1rem", fontWeight: "600", paddingBottom: "10px", borderBottom: "1px solid #e0e0e0" }}>
                  Customer Details
                </h6>
                <Row>
                  <Col md={6}>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#6c757d", fontSize: "0.9rem" }}>Bill To:</strong>
                      <div style={{ color: "#495057", marginTop: "4px" }}>{selectedQuotation.customerInfo.billTo}</div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#6c757d", fontSize: "0.9rem" }}>State Name:</strong>
                      <div style={{ color: "#495057", marginTop: "4px" }}>{selectedQuotation.customerInfo.stateName || "N/A"}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#6c757d", fontSize: "0.9rem" }}>Contact No:</strong>
                      <div style={{ color: "#495057", marginTop: "4px" }}>{selectedQuotation.customerInfo.contactNo}</div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#6c757d", fontSize: "0.9rem" }}>Estimate No:</strong>
                      <div style={{ color: "#495057", marginTop: "4px" }}>{selectedQuotation.customerInfo.estimateNo || "N/A"}</div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#6c757d", fontSize: "0.9rem" }}>Estimate Date:</strong>
                      <div style={{ color: "#495057", marginTop: "4px" }}>{selectedQuotation.customerInfo.estimateDate || "N/A"}</div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#6c757d", fontSize: "0.9rem" }}>Branch:</strong>
                      <div style={{ color: "#495057", marginTop: "4px" }}>{companyInfo.branch}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              <div style={{ marginBottom: "25px" }}>
                <h6 style={{ color: "#495057", marginBottom: "15px", fontSize: "1rem", fontWeight: "600", paddingBottom: "10px", borderBottom: "1px solid #e0e0e0" }}>
                  Items
                </h6>
                <Table bordered hover size="sm">
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "50px" }}>S.No</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600" }}>Description</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "100px" }}>Qty</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "120px" }}>Rate (₹)</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "120px" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuotation.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#6c757d", fontWeight: "500", verticalAlign: "middle" }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          {item.description}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                          {item.qty}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", verticalAlign: "middle" }}>
                          ₹{item.rate.toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#28a745", fontWeight: "600", verticalAlign: "middle" }}>
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div style={{ 
                backgroundColor: "#f8f9fa", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #e9ecef"
              }}>
                <h6 style={{ color: "#495057", marginBottom: "15px", fontSize: "1rem", fontWeight: "600", paddingBottom: "10px", borderBottom: "1px solid #dee2e6" }}>
                  Totals Summary
                </h6>
                <Row>
                  <Col md={8}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "12px 15px", 
                      backgroundColor: "white", 
                      borderRadius: "6px",
                      marginTop: "10px"
                    }}>
                      <h6 style={{ color: "#2c3e50", margin: 0, fontWeight: "700", fontSize: "1.1rem" }}>Total Amount:</h6>
                      <h5 style={{ color: '#007bff', margin: 0, fontWeight: "700", fontSize: "1.2rem" }}>
                        ₹{selectedQuotation.totals.totalAmount.toFixed(2)}
                      </h5>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "1px solid #e0e0e0", padding: "15px 25px" }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowViewModal(false)}
            style={{ 
              padding: "6px 16px", 
              borderRadius: "6px", 
              fontWeight: "500"
            }}
          >
            Close
          </Button>
          {selectedQuotation && (
            <>
              <Button 
                variant="primary" 
                onClick={() => handlePrint(selectedQuotation)}
                style={{ 
                  padding: "6px 16px", 
                  borderRadius: "6px", 
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Printer size={16} />
                Print
              </Button>
              <Button 
                variant="success" 
                onClick={() => handleDownload(selectedQuotation)}
                style={{ 
                  padding: "6px 16px", 
                  borderRadius: "6px", 
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Download size={16} />
                Download
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Quotation Modal */}
      <Modal 
        show={showModal} 
        onHide={() => {
          setShowModal(false);
          resetForm();
        }}
        size="lg"
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton style={{ 
          borderBottom: "1px solid #e0e0e0", 
          backgroundColor: "#007bff", 
          color: "white",
          padding: "15px 25px"
        }}>
          <Modal.Title style={{ fontSize: "1.2rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
            {editId ? <Edit size={20} /> : <PlusCircle size={20} />}
            {editId ? "Edit Quotation" : "Create New Quotation"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto", padding: "25px" }}>
          {error && (
            <Alert variant="danger" style={{ marginBottom: "20px" }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" style={{ marginBottom: "20px" }}>
              {success}
            </Alert>
          )}
          <Form>
            {/* Customer Details Section */}
            <div style={{ marginBottom: "25px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "15px", 
                paddingBottom: "10px", 
                borderBottom: "2px solid #f0f0f0" 
              }}>
                <div style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "8px", 
                  backgroundColor: "#007bff", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  marginRight: "12px",
                  color: "white"
                }}>
                  👤
                </div>
                <h6 style={{ color: "#495057", margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                  Customer Details
                </h6>
              </div>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#495057", marginBottom: "5px" }}>
                      Bill To <span style={{ color: "#dc3545" }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="billTo"
                      value={customerInfo.billTo}
                      onChange={handleCustomerChange}
                      placeholder="Enter customer name"
                      size="sm"
                      required
                      style={{ padding: "8px 12px", borderRadius: "6px" }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#495057", marginBottom: "5px" }}>
                      Contact No <span style={{ color: "#dc3545" }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="contactNo"
                      value={customerInfo.contactNo}
                      onChange={handleCustomerChange}
                      placeholder="Enter phone number"
                      size="sm"
                      required
                      style={{ padding: "8px 12px", borderRadius: "6px" }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#495057", marginBottom: "5px" }}>State Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="stateName"
                      value={customerInfo.stateName}
                      onChange={handleCustomerChange}
                      placeholder="Enter state name"
                      size="sm"
                      style={{ padding: "8px 12px", borderRadius: "6px" }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#495057", marginBottom: "5px" }}>Estimate No</Form.Label>
                    <Form.Control
                      type="text"
                      name="estimateNo"
                      value={customerInfo.estimateNo}
                      onChange={handleCustomerChange}
                      placeholder="Enter estimate number"
                      size="sm"
                      style={{ padding: "8px 12px", borderRadius: "6px" }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#495057", marginBottom: "5px" }}>Estimate Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="estimateDate"
                      value={customerInfo.estimateDate}
                      onChange={handleCustomerChange}
                      size="sm"
                      style={{ padding: "8px 12px", borderRadius: "6px" }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Items Section */}
            <div style={{ marginBottom: "25px" }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: "15px", 
                paddingBottom: "10px", 
                borderBottom: "2px solid #f0f0f0" 
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ 
                    width: "40px", 
                    height: "40px", 
                    borderRadius: "8px", 
                    backgroundColor: "#28a745", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    marginRight: "12px",
                    color: "white"
                  }}>
                    📦
                  </div>
                  <h6 style={{ color: "#495057", margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                    Items
                  </h6>
                </div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={addItem}
                  style={{ 
                    padding: "6px 14px", 
                    borderRadius: "6px", 
                    fontSize: "0.85rem", 
                    fontWeight: "500",
                    borderWidth: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <PlusCircle size={14} />
                  Add Item
                </Button>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <Table bordered hover size="sm" style={{ marginBottom: "0", minWidth: "600px" }}>
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "50px" }}>S.No</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", minWidth: "250px" }}>Description</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "100px" }}>Qty</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "120px" }}>Rate (₹)</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "120px" }}>Amount (₹)</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#495057", fontWeight: "600", width: "80px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#6c757d", fontWeight: "500", verticalAlign: "middle" }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <Form.Control
                            value={item.description}
                            onChange={(e) => handleItemChange(i, "description", e.target.value)}
                            size="sm"
                            placeholder="Enter item description"
                            style={{ padding: "8px 10px", borderRadius: "6px" }}
                            required
                          />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <Form.Control
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(i, "qty", e.target.value)}
                            size="sm"
                            placeholder="Qty"
                            min="1"
                            style={{ padding: "8px 10px", borderRadius: "6px" }}
                            required
                          />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <Form.Control
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(i, "rate", e.target.value)}
                            size="sm"
                            placeholder="Rate"
                            min="0"
                            step="0.01"
                            style={{ padding: "8px 10px", borderRadius: "6px" }}
                            required
                          />
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#28a745", fontWeight: "600", verticalAlign: "middle" }}>
                          ₹{item.amount.toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeItem(i)}
                            disabled={items.length <= 1}
                            style={{ 
                              padding: "4px 8px", 
                              borderRadius: "6px",
                              borderWidth: "1px"
                            }}
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>

            {/* Totals Preview */}
            <div style={{ 
              backgroundColor: "#f8f9fa", 
              padding: "20px", 
              borderRadius: "8px", 
              border: "1px solid #e9ecef",
              marginTop: "20px"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "15px", 
                paddingBottom: "10px", 
                borderBottom: "1px solid #dee2e6" 
              }}>
                <div style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "8px", 
                  backgroundColor: "#6c757d", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  marginRight: "12px",
                  color: "white"
                }}>
                  ₹
                </div>
                <h6 style={{ color: "#495057", margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                  Totals Summary
                </h6>
              </div>
              
              <Row>
                <Col md={8}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    padding: "12px 0", 
                    backgroundColor: "white", 
                    borderRadius: "6px", 
                    padding: "12px 15px",
                    marginTop: "10px"
                  }}>
                    <h6 style={{ color: "#2c3e50", margin: 0, fontWeight: "700", fontSize: "1.1rem" }}>Total Amount:</h6>
                    <h5 style={{ color: '#007bff', margin: 0, fontWeight: "700", fontSize: "1.2rem" }}>₹{totalAmount.toFixed(2)}</h5>
                  </div>
                </Col>
              </Row>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "1px solid #e0e0e0", padding: "15px 25px" }}>
          <Button 
            variant="light" 
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
            size="sm"
            style={{ 
              padding: "6px 16px", 
              borderRadius: "6px", 
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            size="sm"
            disabled={saving || !customerInfo.billTo || !customerInfo.contactNo}
            style={{ 
              padding: "6px 20px", 
              borderRadius: "6px", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" />
                {editId ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                {editId ? "Update Quotation" : "Save Quotation"}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuotationPage;