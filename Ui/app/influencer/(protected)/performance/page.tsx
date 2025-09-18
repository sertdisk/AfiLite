'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getMySales, getInfluencerPerformanceStats, listMyCodesUnsafe } from '../../../../lib/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PerformancePage = () => {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [codes, setCodes] = useState([]);
  const [filters, setFilters] = useState({
    code: '',
    start_date: '',
    end_date: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const fetchSales = useCallback(async () => {
    const params = { ...filters, ...pagination };
    const data = await getMySales(params);
    setSales(data.items);
    setPagination(data.pagination);
  }, [filters, pagination.page, pagination.limit]);

  const fetchStats = useCallback(async () => {
    const data = await getInfluencerPerformanceStats(filters);
    setStats(data);
  }, [filters]);

  const fetchCodes = useCallback(async () => {
    const data = await listMyCodesUnsafe();
    setCodes(data.items);
  }, []);

  useEffect(() => {
    fetchSales();
    fetchStats();
    fetchCodes();
  }, [fetchSales, fetchStats, fetchCodes]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const handleLimitChange = (newLimit) => {
    setPagination({ ...pagination, limit: newLimit, page: 1 });
  };

  const exportToCsv = () => {
    const headers = ['ID', 'Kod', 'Tutar', 'Komisyon', 'Müşteri URL', 'Ürün', 'Tarih'];
    const rows = sales.map(sale => [
      sale.id,
      sale.code,
      sale.total_amount,
      sale.commission,
      sale.customer_url,
      sale.product,
      new Date(sale.recorded_at).toLocaleString(),
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "satislar.csv");
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
  };

  const exportToXlsx = () => {
    const worksheet = XLSX.utils.json_to_sheet(sales);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Satışlar");
    XLSX.writeFile(workbook, "satislar.xlsx");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Performans</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-white">
        <div>
          <label className="block text-sm font-medium text-gray-700">Kod</label>
          <select name="code" value={filters.code} onChange={handleFilterChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
            <option value="">Tümü</option>
            {codes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
          <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
          <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <button onClick={exportToCsv} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">CSV İndir</button>
          <button onClick={exportToXlsx} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Excel İndir</button>
        </div>
        <div>
          <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))} className="p-2 border border-gray-300 rounded-md">
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="bg-white overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Komisyon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.map(sale => (
              <tr key={sale.id}>
                <td className="px-6 py-4 whitespace-nowrap">{sale.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{sale.code}</td>
                <td className="px-6 py-4 whitespace-nowrap">{sale.total_amount.toFixed(2)} TL</td>
                <td className="px-6 py-4 whitespace-nowrap">{sale.commission.toFixed(2)} TL</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(sale.recorded_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span>Sayfa {pagination.page} / {pagination.pages}</span>
        <div>
          <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l">Önceki</button>
          <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r">Sonraki</button>
        </div>
      </div>

      {stats && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Performans Grafikleri</h2>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Line data={stats} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePage;
