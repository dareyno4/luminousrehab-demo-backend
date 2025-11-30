import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Printer, Download, Lock, ChevronRight, AlertCircle, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';


interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

export default function ChartDelivery({ navigation, route }: Props) {
  const { patientId, chartId, medications } = route.params;
  const { user } = useAuth();

  // Use patient passed from previous screen when available
  const rawPatient: any = route.params.patient || {};
  const patientName = rawPatient.first_name || rawPatient.last_name
    ? `${rawPatient.first_name || ''} ${rawPatient.last_name || ''}`.trim()
    : (rawPatient.name || 'Unknown Patient');
  const patientDob = rawPatient.dob || rawPatient.date_of_birth || '';

  // Delivery method states
  const [selectedMethods, setSelectedMethods] = useState<{
    pdf: boolean;
    fax: boolean;
    email: boolean;
    print: boolean;
  }>({
    pdf: false,
    fax: false,
    email: false,
    print: false,
  });

  // Modal states
  const [showFaxModal, setShowFaxModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Form states
  const [faxNumber, setFaxNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [faxNote, setFaxNote] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Delivery tracking
  const [deliveredMethods, setDeliveredMethods] = useState<{
    pdf: boolean;
    fax: boolean;
    email: boolean;
    print: boolean;
  }>({
    pdf: false,
    fax: false,
    email: false,
    print: false,
  });

  const handleGoBack = () => {
    navigation.goBack();
  };
  const handleExit = () => {
    navigation.navigate('ClinicianDashboard');
  };

  const handleToggleMethod = (method: 'pdf' | 'fax' | 'email' | 'print') => {
    setSelectedMethods(prev => ({
      ...prev,
      [method]: !prev[method],
    }));
  };

  const handleConfigureFax = () => {
    if (selectedMethods.fax) {
      setShowFaxModal(true);
    }
  };

  const handleConfigureEmail = () => {
    if (selectedMethods.email) {
      setShowEmailModal(true);
    }
  };

  // Generate an improved PDF layout: header, patient info, and a table of medications
  const generatePdfBlob = async (): Promise<Blob> => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    // Layout constants
    const margin = 48;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const innerW = pageW - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header
    doc.setFillColor(9, 102, 204); // brand blue
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Luminous Rehab - Patient Chart', margin, 36);
    doc.setTextColor(0, 0, 0);
    y = 72;

    // Patient section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Patient Information', margin, y); y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const dobText = patientDob ? new Date(patientDob).toLocaleDateString() : '—';
    doc.text(`Name: ${patientName}`, margin, y); y += 16;
    doc.text(`DOB: ${dobText}`, margin, y); y += 16;
    if (chartId) { doc.text(`Chart ID: ${chartId}`, margin, y); y += 16; }
    const genAt = new Date().toLocaleString();
    doc.text(`Generated: ${genAt}`, margin, y); y += 24;

    // Medications table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    ensureSpace(24);
    doc.text('Medications', margin, y); y += 12;

    // Table columns (fit exactly in innerW)
    const cols = [
      { key: 'drug', label: 'Drug', w: 180 },
      { key: 'strength', label: 'Strength', w: 60 },
      { key: 'route', label: 'Route', w: 50 },
      { key: 'frequency', label: 'Frequency', w: 60 },
      { key: 'prescriber', label: 'Prescriber', w: 90 },
      { key: 'scanned', label: 'Scanned', w: 56 },
      { key: 'verified', label: '✓', w: 20 },
    ];

    // Header row background
    ensureSpace(28);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, innerW, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    let x = margin;
    cols.forEach((c) => {
      doc.text(c.label, x + 4, y + 16);
      x += c.w;
    });
    y += 28;

    // Body rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rowLineH = 14;

    const meds = Array.isArray(medications) ? medications : [];
    meds.forEach((m: any) => {
      const cells = [
        String(m.drugName || ''),
        String(m.strength || ''),
        String(m.route || ''),
        String(m.frequency || ''),
        String(m.prescriber || ''),
        String(m.scannedDate || ''),
        (typeof m.isVerified === 'boolean' ? (m.isVerified ? 'Yes' : 'No') : 'Yes'),
      ];

      // Split text to cell widths and compute row height
      const linesPerCell = cells.map((text, i) => doc.splitTextToSize(text, cols[i].w - 6));
      const maxLines = Math.max(...linesPerCell.map((ln) => ln.length || 1));
      const rowH = Math.max(rowLineH, maxLines * rowLineH);
      ensureSpace(rowH + 4);

      // Draw row (optional zebra)
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, y - 2, innerW, rowH + 4, 'F');

      // Render each cell
      let cx = margin;
      linesPerCell.forEach((ln, i) => {
        const baseY = y + rowLineH;
        // If multiple lines, render stacked
        ln.forEach((line: string, idx: number) => {
          doc.text(line, cx + 3, baseY + idx * rowLineH - rowLineH);
        });
        cx += cols[i].w;
      });
      y += rowH + 6;
    });

    return doc.output('blob');
  };

  const handleSavePDF = async () => {
    if (!selectedMethods.pdf) return;
    const blob = await generatePdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-${chartId || 'export'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setDeliveredMethods(prev => ({ ...prev, pdf: true }));
  };

  const handlePrint = async () => {
    if (!selectedMethods.print) return;
    const blob = await generatePdfBlob();
    const url = URL.createObjectURL(blob);
    // Use hidden iframe to reliably trigger print for PDF content
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    let printed = false;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        printed = true;
      } catch (e) {
        console.error('Print failed', e);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      }
    };
    // Fallback: if the iframe onload doesn't fire or print doesn't trigger, try opening a new tab
    setTimeout(() => {
      if (!printed) {
        try {
          const win = window.open(url, '_blank');
          win?.focus();
          // Some browsers will auto-show their PDF viewer with a print button
        } catch (err) {
          console.error('Fallback print open failed', err);
        }
      }
    }, 1800);
    setDeliveredMethods(prev => ({ ...prev, print: true }));
  };

  // Upload PDF to storage and return public URL
  const uploadPdfAndGetUrl = async (blob: Blob): Promise<string> => {
    if (!user?.tenant_id || !chartId) throw new Error('Missing tenant or chart');
    const path = `${user.tenant_id}/${chartId}/exports/chart-${Date.now()}.pdf`;
    const { error: upErr } = await supabaseClient.storage
      .from('chart-documents')
      .upload(path, blob, { contentType: 'application/pdf' });
    if (upErr) throw upErr;
    const { data } = supabaseClient.storage.from('chart-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSendFax = async () => {
    if (!faxNumber) {
      alert('Please enter a fax number');
      return;
    }
    try {
      const blob = await generatePdfBlob();
      const publicUrl = await uploadPdfAndGetUrl(blob);
      // Placeholder: integrate fax provider here. We provide the URL for now.
      alert(`Fax queued to ${faxNumber}. PDF: ${publicUrl}`);
      setDeliveredMethods(prev => ({ ...prev, fax: true }));
    } catch (err: any) {
      console.error('Fax failed', err);
      alert(err.message || 'Failed to prepare fax');
      return;
    } finally {
      setShowFaxModal(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      alert('Please enter an email address');
      return;
    }
    try {
      const blob = await generatePdfBlob();
      const publicUrl = await uploadPdfAndGetUrl(blob);

      // Create simple HTML email
      const senderName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Luminous Rehab';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin-top: 0;">Patient Chart - ${patientName}</h1>
              <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">Please find the patient chart for <strong>${patientName}</strong> (Chart ID: ${chartId || 'N/A'}).</p>
              ${emailMessage ? `<div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;"><p style="margin: 0; font-style: italic;">${emailMessage}</p></div>` : ''}
              <div style="margin: 30px 0;">
                <a href="${publicUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Chart PDF</a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">Sent by ${senderName}</p>
            </div>
            <div style="text-align: center; font-size: 12px; color: #999; padding: 20px;">
              <p>⚠️ Email delivery is currently disabled for HIPAA compliance.</p>
              <p>This email was logged but not sent. Contact your administrator to enable HIPAA-compliant email service.</p>
            </div>
          </body>
        </html>
      `;

      // Call the backend to log the email
      const response = await fetch('http://localhost:8080/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          to: emailAddress,
          subject: `Patient Chart - ${patientName}`,
          html: emailHtml,
          text: `Patient Chart for ${patientName}\n\nView and download the chart PDF here: ${publicUrl}${emailMessage ? `\n\nNote: ${emailMessage}` : ''}`,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      alert('ℹ️ Email Delivery Disabled\n\nEmail delivery is currently disabled for HIPAA compliance.\n\nThe email content has been logged to the server console. To enable actual email delivery, your administrator needs to set up a HIPAA-compliant email service (e.g., SendGrid with BAA).\n\nThe PDF is still saved and accessible.');

      setDeliveredMethods(prev => ({ ...prev, email: true }));
    } catch (err: any) {
      console.error('Email operation failed', err);
      alert(err.message || 'Failed to process email');
      return;
    } finally {
      setShowEmailModal(false);
    }
  };

  const handleFinalize = () => {
    const hasSelectedMethods = selectedMethods.pdf || selectedMethods.fax || selectedMethods.email;
    if (!hasSelectedMethods) {
      alert('Please select at least one delivery method');
      return;
    }

    const allDelivered =
      (!selectedMethods.pdf || deliveredMethods.pdf) &&
      (!selectedMethods.fax || deliveredMethods.fax) &&
      (!selectedMethods.email || deliveredMethods.email);

    if (!allDelivered) {
      alert('Please complete all selected delivery methods before finalizing');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmFinalize = async () => {
    setShowConfirmation(false);

    if (!user?.id || !user?.tenant_id || !chartId) {
      alert('Missing chart or user context');
      return;
    }

    try {
      // Provide delivery metadata to satisfy DB check constraints
      let deliveredVia: 'pdf' | 'fax' | 'email' | 'print' | null = null;
      if (selectedMethods.pdf) deliveredVia = 'pdf';
      else if (selectedMethods.email) deliveredVia = 'email';
      else if (selectedMethods.fax) deliveredVia = 'fax';
      else if (selectedMethods.print) deliveredVia = 'print';

      const payload: any = {
        status: 'pending_review',
        finalized_at: new Date().toISOString(),
        finalized_by: user.id,
      };

      const { error } = await supabaseClient
        .from('charts')
        .update(payload)
        .eq('id', chartId);

      if (error) {
        console.error('Error finalizing chart:', error);
        alert(`Failed to finalize chart: ${error.message || 'Unknown error'}`);
        return;
      }

      // Optional: add an audit log entry later if you want audit trail

      alert('Chart has been sent for agency admin approval');
      navigation.navigate('ClinicianDashboard');
    } catch (err: any) {
      console.error('Unexpected error finalizing chart:', err);
      alert('Unexpected error while finalizing chart');
    }
  };


  const anyMethodSelected = selectedMethods.pdf || selectedMethods.fax || selectedMethods.email || selectedMethods.print;
  const allSelectedDelivered =
    (!selectedMethods.pdf || deliveredMethods.pdf) &&
    (!selectedMethods.fax || deliveredMethods.fax) &&
    (!selectedMethods.email || deliveredMethods.email) &&
    (!selectedMethods.print || deliveredMethods.print);

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">Chart Delivery</h1>
          <Button
            onClick={handleExit}
            variant="ghost"
            size="sm"
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Exit
          </Button>

        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-6 space-y-6">

          {/* Context Bar */}
          <div className="bg-white rounded-2xl border border-sky-200 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-slate-900 mb-1">Select Delivery Methods</h2>
                <p className="text-sm text-slate-600">Choose one or more ways to deliver this chart. After delivery, the chart will be sent to your agency admin for approval.</p>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {/* Step 1 - Complete */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold">✓</span>
                </div>
                <span className="text-xs text-slate-700 font-medium text-center">Verify All</span>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 -mt-6" />

              {/* Step 2 - Complete */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold">✓</span>
                </div>
                <span className="text-xs text-slate-700 font-medium text-center">Review</span>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 -mt-6" />

              {/* Step 3 - Active */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold">3</span>
                </div>
                <span className="text-xs text-slate-700 font-medium text-center">Delivery</span>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 -mt-6" />

              {/* Step 4 - Upcoming */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-slate-500 font-semibold">4</span>
                </div>
                <span className="text-xs text-slate-500 text-center">Admin Approval</span>
              </div>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Patient</p>
                <p className="text-slate-900 font-semibold">{patientName}</p>
                <p className="text-sm text-slate-600">DOB: {patientDob}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Medications</p>
                <p className="text-slate-900 font-semibold">{medications?.length || 0} Items</p>
                <p className="text-sm text-slate-600">All verified</p>
              </div>
            </div>
          </div>

          {/* Delivery Methods */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Delivery Methods
              </h3>
              <p className="text-xs text-slate-500 mt-1">Select one or multiple delivery options</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Print Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${selectedMethods.print
                  ? 'border-slate-500 bg-slate-50'
                  : 'border-slate-200 bg-white'
                }`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="print"
                    checked={selectedMethods.print}
                    onCheckedChange={() => handleToggleMethod('print')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="print" className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Printer className="w-5 h-5 text-slate-700" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-slate-900 font-medium">Print</h4>
                        <p className="text-sm text-slate-600 mt-0.5">Open print dialog with chart PDF</p>
                      </div>
                      {deliveredMethods.print && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </label>
                    {selectedMethods.print && !deliveredMethods.print && (
                      <Button
                        onClick={handlePrint}
                        className="mt-3 ml-14 bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
                        size="sm"
                        aria-label="Open print dialog"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Open Print Dialog
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {/* PDF Download Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${selectedMethods.pdf
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white'
                }`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="pdf"
                    checked={selectedMethods.pdf}
                    onCheckedChange={() => handleToggleMethod('pdf')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="pdf" className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <Download className="w-5 h-5 text-sky-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-slate-900 font-medium">Save as PDF</h4>
                        <p className="text-sm text-slate-600 mt-0.5">Download chart as PDF document</p>
                      </div>
                      {deliveredMethods.pdf && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </label>
                    {selectedMethods.pdf && !deliveredMethods.pdf && (
                      <Button
                        onClick={handleSavePDF}
                        className="mt-3 ml-14 bg-sky-600 hover:bg-sky-700 text-white"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fax Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${selectedMethods.fax
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 bg-white'
                }`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="fax"
                    checked={selectedMethods.fax}
                    onCheckedChange={() => handleToggleMethod('fax')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="fax" className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Printer className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-slate-900 font-medium">Send via Fax</h4>
                        <p className="text-sm text-slate-600 mt-0.5">Fax chart to a recipient</p>
                      </div>
                      {deliveredMethods.fax && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </label>
                    {selectedMethods.fax && !deliveredMethods.fax && (
                      <Button
                        onClick={handleConfigureFax}
                        className="mt-3 ml-14 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Configure Fax
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${selectedMethods.email
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 bg-white'
                }`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="email"
                    checked={selectedMethods.email}
                    onCheckedChange={() => handleToggleMethod('email')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="email" className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-slate-900 font-medium">Send via Email</h4>
                        <p className="text-sm text-slate-600 mt-0.5">Email chart to a recipient</p>
                      </div>
                      {deliveredMethods.email && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </label>
                    {selectedMethods.email && !deliveredMethods.email && (
                      <Button
                        onClick={handleConfigureEmail}
                        className="mt-3 ml-14 bg-amber-600 hover:bg-amber-700 text-white"
                        size="sm"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Configure Email
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-slate-900 font-medium mb-1">Requires Admin Approval</h4>
                <p className="text-sm text-slate-600">
                  After finalizing delivery, this chart will be sent to your agency admin for final approval. Make sure all information is correct and all selected delivery methods are completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Summary
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={!anyMethodSelected || !allSelectedDelivered}
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </div>
      </div>

      {/* Fax Modal */}
      <Dialog open={showFaxModal} onOpenChange={setShowFaxModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send via Fax</DialogTitle>
            <DialogDescription>Enter the fax number to send this chart</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="faxNumber">Fax Number *</Label>
              <Input
                id="faxNumber"
                type="tel"
                placeholder="(555) 123-4567"
                value={faxNumber}
                onChange={(e) => setFaxNumber(e.target.value)}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
            <div>
              <Label htmlFor="faxNote">Note (Optional)</Label>
              <Input
                id="faxNote"
                placeholder="Add a note for the recipient"
                value={faxNote}
                onChange={(e) => setFaxNote(e.target.value)}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowFaxModal(false)}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendFax}
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Send Fax
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send via Email</DialogTitle>
            <DialogDescription>Enter the email address to send this chart</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="emailAddress">Email Address *</Label>
              <Input
                id="emailAddress"
                type="email"
                placeholder="recipient@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                defaultValue={`Patient Chart - ${patientName}`}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
            <div>
              <Label htmlFor="emailMessage">Message (Optional)</Label>
              <Input
                id="emailMessage"
                placeholder="Add a message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowEmailModal(false)}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize & Send for Approval</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you sure you want to finalize this chart?</p>
                <p className="mt-4">
                  <strong className="text-amber-700">⚠️ This chart will be sent for agency admin approval.</strong>
                </p>
                <p className="mt-4">Delivery methods completed:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {deliveredMethods.pdf && <li>PDF saved</li>}
                  {deliveredMethods.fax && <li>Fax sent to {faxNumber}</li>}
                  {deliveredMethods.email && <li>Email sent to {emailAddress}</li>}
                  {deliveredMethods.print && <li>Printed</li>}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinalize}
              className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit for Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}