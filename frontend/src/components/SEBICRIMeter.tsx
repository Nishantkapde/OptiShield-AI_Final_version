// SEBICRIMeter.tsx
import React, { useState, useMemo } from 'react';
import {
  Shield,
  FileCheck,
  Download,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Award,
} from 'lucide-react';

// --- Interfaces ---
type FrameworkType = 'ISO 27001' | 'NIST CSF 2.0' | 'SEBI CSCRF';
type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant';

interface ComplianceParameter {
  id: string;
  code: string;
  name: string;
  category: string;
  status: ComplianceStatus;
  maturityScore: number; // 0.0 - 5.0
  weight: number; // importance 1-10
}

interface FrameworkConfig {
  id: FrameworkType;
  totalParams: number;
  maxScore: number;
  description: string;
}

// --- Mock Data ---
const FRAMEWORKS: FrameworkConfig[] = [
  {
    id: 'ISO 27001',
    totalParams: 114,
    maxScore: 5.0,
    description: 'International information security management standard',
  },
  {
    id: 'NIST CSF 2.0',
    totalParams: 108,
    maxScore: 5.0,
    description: 'NIST Cybersecurity Framework version 2.0',
  },
  {
    id: 'SEBI CSCRF',
    totalParams: 23,
    maxScore: 5.0,
    description: 'SEBI Cybersecurity and Cyber Resilience Framework for regulated entities',
  },
];

const SEBI_PARAMETERS: ComplianceParameter[] = [
  {
    id: 'p1',
    code: 'CSCRF-01',
    name: 'Cyber Security Policy & Governance',
    category: 'Governance',
    status: 'compliant',
    maturityScore: 4.5,
    weight: 10,
  },
  {
    id: 'p2',
    code: 'CSCRF-02',
    name: 'Asset Inventory Management',
    category: 'Governance',
    status: 'compliant',
    maturityScore: 4.2,
    weight: 9,
  },
  {
    id: 'p3',
    code: 'CSCRF-03',
    name: 'Identity & Access Management',
    category: 'Access Control',
    status: 'compliant',
    maturityScore: 4.8,
    weight: 10,
  },
  {
    id: 'p4',
    code: 'CSCRF-04',
    name: 'Privileged Access Management',
    category: 'Access Control',
    status: 'partial',
    maturityScore: 3.2,
    weight: 9,
  },
  {
    id: 'p5',
    code: 'CSCRF-05',
    name: 'Data Classification & Protection',
    category: 'Data Security',
    status: 'partial',
    maturityScore: 3.5,
    weight: 8,
  },
  {
    id: 'p6',
    code: 'CSCRF-06',
    name: 'Network Security & Segmentation',
    category: 'Network',
    status: 'compliant',
    maturityScore: 4.3,
    weight: 8,
  },
  {
    id: 'p7',
    code: 'CSCRF-07',
    name: 'Vulnerability Management',
    category: 'Vulnerability',
    status: 'partial',
    maturityScore: 3.8,
    weight: 9,
  },
  {
    id: 'p8',
    code: 'CSCRF-08',
    name: 'Patch Management',
    category: 'Vulnerability',
    status: 'partial',
    maturityScore: 3.0,
    weight: 8,
  },
  {
    id: 'p9',
    code: 'CSCRF-09',
    name: 'Security Incident Management',
    category: 'Incident Response',
    status: 'compliant',
    maturityScore: 4.6,
    weight: 10,
  },
  {
    id: 'p10',
    code: 'CSCRF-10',
    name: 'Business Continuity Planning',
    category: 'Resilience',
    status: 'partial',
    maturityScore: 3.4,
    weight: 9,
  },
  {
    id: 'p11',
    code: 'CSCRF-11',
    name: 'Disaster Recovery',
    category: 'Resilience',
    status: 'non-compliant',
    maturityScore: 2.1,
    weight: 9,
  },
  {
    id: 'p12',
    code: 'CSCRF-12',
    name: 'Third-Party Risk Management',
    category: 'Vendor',
    status: 'partial',
    maturityScore: 3.6,
    weight: 8,
  },
  {
    id: 'p13',
    code: 'CSCRF-13',
    name: 'Cloud Security Controls',
    category: 'Cloud',
    status: 'compliant',
    maturityScore: 4.4,
    weight: 8,
  },
  {
    id: 'p14',
    code: 'CSCRF-14',
    name: 'Encryption Standards',
    category: 'Data Security',
    status: 'compliant',
    maturityScore: 4.7,
    weight: 9,
  },
  {
    id: 'p15',
    code: 'CSCRF-15',
    name: 'Security Awareness Training',
    category: 'Human',
    status: 'partial',
    maturityScore: 3.3,
    weight: 7,
  },
  {
    id: 'p16',
    code: 'CSCRF-16',
    name: 'Log Management & Monitoring',
    category: 'Monitoring',
    status: 'compliant',
    maturityScore: 4.5,
    weight: 9,
  },
  {
    id: 'p17',
    code: 'CSCRF-17',
    name: 'Threat Intelligence Integration',
    category: 'Monitoring',
    status: 'partial',
    maturityScore: 3.7,
    weight: 7,
  },
  {
    id: 'p18',
    code: 'CSCRF-18',
    name: 'Application Security Testing',
    category: 'AppSec',
    status: 'partial',
    maturityScore: 3.9,
    weight: 8,
  },
  {
    id: 'p19',
    code: 'CSCRF-19',
    name: 'API Security Controls',
    category: 'AppSec',
    status: 'non-compliant',
    maturityScore: 2.4,
    weight: 9,
  },
  {
    id: 'p20',
    code: 'CSCRF-20',
    name: 'Regulatory Reporting Automation',
    category: 'Compliance',
    status: 'compliant',
    maturityScore: 4.1,
    weight: 7,
  },
  {
    id: 'p21',
    code: 'CSCRF-21',
    name: 'Cyber Crisis Management Plan',
    category: 'Incident Response',
    status: 'partial',
    maturityScore: 3.5,
    weight: 9,
  },
  {
    id: 'p22',
    code: 'CSCRF-22',
    name: 'Forensic Readiness',
    category: 'Incident Response',
    status: 'partial',
    maturityScore: 3.2,
    weight: 8,
  },
  {
    id: 'p23',
    code: 'CSCRF-23',
    name: 'Continuous Compliance Monitoring',
    category: 'Compliance',
    status: 'compliant',
    maturityScore: 4.2,
    weight: 8,
  },
];

// --- Status Config ---
const STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; classes: string; icon: React.ElementType; color: string }
> = {
  compliant: {
    label: 'Compliant',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
    color: '#34d399',
  },
  partial: {
    label: 'Partial',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: AlertCircle,
    color: '#f59e0b',
  },
  'non-compliant': {
    label: 'Non-Compliant',
    classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: XCircle,
    color: '#f43f5e',
  },
};

// --- Main Component ---
const SEBICRIMeter: React.FC = () => {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>('SEBI CSCRF');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ComplianceStatus | 'all'>('all');

  const framework = FRAMEWORKS.find((f) => f.id === selectedFramework)!;

  const overallScore = useMemo(() => {
    const totalWeight = SEBI_PARAMETERS.reduce((a, b) => a + b.weight, 0);
    const weightedScore = SEBI_PARAMETERS.reduce(
      (a, b) => a + b.maturityScore * b.weight,
      0
    );
    return weightedScore / totalWeight;
  }, []);

  const statusCounts = useMemo(() => {
    return {
      compliant: SEBI_PARAMETERS.filter((p) => p.status === 'compliant').length,
      partial: SEBI_PARAMETERS.filter((p) => p.status === 'partial').length,
      'non-compliant': SEBI_PARAMETERS.filter((p) => p.status === 'non-compliant').length,
    };
  }, []);

  const filteredParams = useMemo(() => {
    if (filterStatus === 'all') return SEBI_PARAMETERS;
    return SEBI_PARAMETERS.filter((p) => p.status === filterStatus);
  }, [filterStatus]);

  const scorePercent = (overallScore / framework.maxScore) * 100;

  const scoreColor =
    scorePercent >= 80 ? '#34d399' : scorePercent >= 60 ? '#f59e0b' : '#f43f5e';

  const handleExportPDF = () => {
    // In production, this would trigger a PDF generation service
    console.log(`Exporting ${selectedFramework} audit report...`);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Compliance Maturity</h2>
            <p className="text-xs text-slate-400">Continuous framework monitoring</p>
          </div>
        </div>

        {/* Framework Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{selectedFramework}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                showDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-10 overflow-hidden">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => {
                    setSelectedFramework(fw.id);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0 ${
                    fw.id === selectedFramework ? 'bg-emerald-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{fw.id}</span>
                    {fw.id === selectedFramework && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{fw.description}</p>
                  <p className="text-xs text-slate-600 mt-1">{fw.totalParams} parameters</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Maturity Meter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-white">
              {selectedFramework} Maturity Score
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {framework.totalParams} mandated parameters
          </span>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center mb-5">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold" style={{ color: scoreColor }}>
                {overallScore.toFixed(2)}
              </span>
              <span className="text-xl text-slate-500">/ {framework.maxScore.toFixed(1)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Weighted continuous maturity index
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-3">
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-1000"
              style={{ width: `${scorePercent}%`, backgroundColor: scoreColor }}
            />
          </div>
          {/* Scale markers */}
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            {[0, 1, 2, 3, 4, 5].map((v) => (
              <span key={v}>{v}.0</span>
            ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800">
          <button
            onClick={() => setFilterStatus(filterStatus === 'compliant' ? 'all' : 'compliant')}
            className={`text-center p-2 rounded-lg transition-colors ${
              filterStatus === 'compliant' ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-400">{statusCounts.compliant}</p>
            <p className="text-xs text-slate-500">Compliant</p>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'partial' ? 'all' : 'partial')}
            className={`text-center p-2 rounded-lg transition-colors ${
              filterStatus === 'partial' ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-400">{statusCounts.partial}</p>
            <p className="text-xs text-slate-500">Partial</p>
          </button>
          <button
            onClick={() =>
              setFilterStatus(filterStatus === 'non-compliant' ? 'all' : 'non-compliant')
            }
            className={`text-center p-2 rounded-lg transition-colors ${
              filterStatus === 'non-compliant' ? 'bg-rose-500/10' : 'hover:bg-slate-800/50'
            }`}
          >
            <XCircle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-rose-400">{statusCounts['non-compliant']}</p>
            <p className="text-xs text-slate-500">Non-Compliant</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SEBICRIMeter;
           