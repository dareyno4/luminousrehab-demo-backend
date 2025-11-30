import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Screen, NavigationParams } from '../../App';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

export default function EditAgency({ navigation, route }: Props) {
  const agencyData = route.params.agencyData as any;

  const [formData, setFormData] = useState({
    agencyName: agencyData?.name || '',
    subdomain: agencyData?.subdomain?.replace('.app', '') || '',
    ein: agencyData?.ein || '',
    contactEmail: agencyData?.contact || '',
    contactPhone: '',
    paymentToken: '',
    status: agencyData?.status || 'Active',
    baaSigned: agencyData?.baaStatus === 'BAA Signed',
    testMode: agencyData?.testMode || false,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Updating agency:', formData);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigation.goBack()}
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl text-[#0f172a] truncate">Edit Agency</h1>
              <p className="text-sm text-[#64748b] truncate">Update agency information</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Agency Name */}
          <div className="space-y-2">
            <Label htmlFor="agencyName">
              Agency Name <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              id="agencyName"
              type="text"
              required
              value={formData.agencyName}
              onChange={(e) => handleChange('agencyName', e.target.value)}
              placeholder="Enter agency name"
              className="w-full"
            />
          </div>

          {/* Subdomain */}
          <div className="space-y-2">
            <Label htmlFor="subdomain">
              Subdomain <span className="text-[#DC2626]">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                type="text"
                required
                value={formData.subdomain}
                onChange={(e) => handleChange('subdomain', e.target.value)}
                placeholder="subdomain"
                className="flex-1"
              />
              <span className="text-[#64748b]">.app</span>
            </div>
          </div>

          {/* EIN */}
          <div className="space-y-2">
            <Label htmlFor="ein">EIN</Label>
            <Input
              id="ein"
              type="text"
              value={formData.ein}
              onChange={(e) => handleChange('ein', e.target.value)}
              placeholder="12-3456789"
              className="w-full"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">
              Contact Email <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              id="contactEmail"
              type="email"
              required
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              placeholder="admin@agency.com"
              className="w-full"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full"
            />
          </div>

          {/* Payment Token */}
          <div className="space-y-2">
            <Label htmlFor="paymentToken">Payment Token</Label>
            <Input
              id="paymentToken"
              type="text"
              value={formData.paymentToken}
              onChange={(e) => handleChange('paymentToken', e.target.value)}
              placeholder="Stripe customer ID"
              className="w-full"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-[#DC2626]">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="baaSigned"
                checked={formData.baaSigned}
                onCheckedChange={(checked) => handleChange('baaSigned', checked as boolean)}
              />
              <Label htmlFor="baaSigned" className="cursor-pointer">
                BAA Signed
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="testMode"
                checked={formData.testMode}
                onCheckedChange={(checked) => handleChange('testMode', checked as boolean)}
              />
              <Label htmlFor="testMode" className="cursor-pointer">
                Test Mode
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#e2e8f0]">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
            >
              Save Changes
            </Button>
          </div>
        </form>
        </div>
      </main>
    </div>
  );
}
