import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Printer, Download, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';


interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

export default function MedicationVerificationDelivery({ navigation, route }: Props) {
  const { patientId, chartId, medicationData } = route.params;

  const [patientName, setPatientName] = useState<string>('');
  const [patientDob, setPatientDob] = useState<string>('');

  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) return;
      try {
        const { data, error } = await supabaseClient
          .from('patients')
          .select('first_name, last_name, date_of_birth')
          .eq('id', patientId)
          .single();
        if (error) throw error;
        if (!data) return;

        setPatientName(`${data.first_name} ${data.last_name}`);
        setPatientDob(
          data.date_of_birth
            ? new Date(data.date_of_birth).toLocaleDateString()
            : ''
        );
      } catch (err) {
        console.error('Error loading patient for delivery', err);
      }
    };

    loadPatient();
  }, [patientId]);

  // Delivery method states
  const [selectedMethods, setSelectedMethods] = useState<{
    pdf: boolean;
    print: boolean;
    fax: boolean;
    email: boolean;
  }>({
    pdf: false,
    print: false,
    fax: false,
    email: false,
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
    print: boolean;
    fax: boolean;
    email: boolean;
  }>({
    pdf: false,
    print: false,
    fax: false,
    email: false,
  });

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleToggleMethod = (method: 'pdf' | 'print' | 'fax' | 'email') => {
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

  const handleSavePDF = () => {
    if (selectedMethods.pdf) {
      // Simulate PDF download
      alert('PDF generated and downloaded');
      setDeliveredMethods(prev => ({ ...prev, pdf: true }));
    }
  };

  const handlePrint = () => {
    if (selectedMethods.print) {
      // Simulate print dialog
      alert('Opening print dialog...');
      setDeliveredMethods(prev => ({ ...prev, print: true }));
    }
  };

  const handleSendFax = () => {
    if (!faxNumber) {
      alert('Please enter a fax number');
      return;
    }
    setShowFaxModal(false);
    setTimeout(() => {
      alert('Fax sent successfully to ' + faxNumber);
      setDeliveredMethods(prev => ({ ...prev, fax: true }));
    }, 300);
  };

  const handleSendEmail = () => {
    if (!emailAddress) {
      alert('Please enter an email address');
      return;
    }
    setShowEmailModal(false);
    setTimeout(() => {
      alert('Email sent successfully to ' + emailAddress);
      setDeliveredMethods(prev => ({ ...prev, email: true }));
    }, 300);
  };

  const handleFinalize = () => {
    const hasSelectedMethods = selectedMethods.pdf || selectedMethods.print || selectedMethods.fax || selectedMethods.email;
    if (!hasSelectedMethods) {
      alert('Please select at least one delivery method');
      return;
    }

    const allDelivered = 
      (!selectedMethods.pdf || deliveredMethods.pdf) &&
      (!selectedMethods.print || deliveredMethods.print) &&
      (!selectedMethods.fax || deliveredMethods.fax) &&
      (!selectedMethods.email || deliveredMethods.email);

    if (!allDelivered) {
      alert('Please complete all selected delivery methods before finalizing');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmFinalize = () => {
    setShowConfirmation(false);
    // Send chart for agency admin approval
    setTimeout(() => {
      alert('Chart has been sent for agency admin approval');
      navigation.navigate('ClinicianDashboard');
    }, 300);
  };

  const anyMethodSelected = selectedMethods.pdf || selectedMethods.print || selectedMethods.fax || selectedMethods.email;
  const allSelectedDelivered = 
    (!selectedMethods.pdf || deliveredMethods.pdf) &&
    (!selectedMethods.print || deliveredMethods.print) &&
    (!selectedMethods.fax || deliveredMethods.fax) &&
    (!selectedMethods.email || deliveredMethods.email);

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
          <div className="w-10" />
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

          {/* Patient Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Patient</p>
                <p className="text-slate-900 font-semibold">{patientName || 'Patient'}</p>
                <p className="text-sm text-slate-600">DOB: {patientDob || 'Not Provided'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Medication</p>
                <p className="text-slate-900 font-semibold">{medicationData?.drugName}</p>
                <p className="text-sm text-slate-600">{medicationData?.strength}</p>
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
              {/* PDF Download Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${
                selectedMethods.pdf 
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

              {/* Print Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${
                selectedMethods.print 
                  ? 'border-purple-500 bg-purple-50' 
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
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Printer className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-slate-900 font-medium">Print Chart</h4>
                        <p className="text-sm text-slate-600 mt-0.5">Print chart to physical printer</p>
                      </div>
                      {deliveredMethods.print && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </label>
                    {selectedMethods.print && !deliveredMethods.print && (
                      <Button
                        onClick={handlePrint}
                        className="mt-3 ml-14 bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fax Option */}
              <div className={`border-2 rounded-xl p-5 transition-all ${
                selectedMethods.fax 
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
              <div className={`border-2 rounded-xl p-5 transition-all ${
                selectedMethods.email 
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
                defaultValue={`Patient Chart - ${patientName || 'Patient'}`}
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
                  {deliveredMethods.print && <li>Chart printed</li>}
                  {deliveredMethods.fax && <li>Fax sent to {faxNumber}</li>}
                  {deliveredMethods.email && <li>Email sent to {emailAddress}</li>}
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
