"use client";
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Edit, FileText, ArrowUpRight, ArrowDownLeft, Download, Users, ChevronRight, Calendar, Camera, AlertTriangle } from 'lucide-react';
import BookingModal from '../components/bookings/BookingModal';
import DepositActionModal from '../components/DepositActionModal';
import { STATUS } from '../utils/constants';
import { fmtCurrency, fmtDate } from '../utils/formatters';
import { calculateLateFee } from '../utils/calculateLateFee';
import { generateInvoice } from '../utils/InvoiceGenerator';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useOrganization } from '../context/OrgContext';
import { useToast } from '../components/ui/Toast';
import { exportToCSV } from '../utils/exportCSV';

const PAGE_SIZE = 20;
const PAYMENT_STATUSES = [
    { value: 'all', label: 'Alle' },
    { value: 'paid', label: 'Bezahlt' },
    { value: 'open', label: 'Offen' },
    { value: 'refunded', label: 'Rückerstattet' },
];
const SOURCES = [
    { value: 'all', label: 'Alle' },
    { value: 'website', label: 'Website' },
    { value: 'walk_in', label: 'Vor Ort' },
    { value: 'phone', label: 'Telefonisch' },
    { value: 'hotel_qr', label: 'Hotel QR' },
];
