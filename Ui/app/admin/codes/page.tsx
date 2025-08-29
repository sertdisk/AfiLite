'use client';
import React, { useState, useEffect } from 'react';

interface Code {
  id: string;
  influencer_id: string;
  code: string;
  discount_percentage: number;
  commission_pct: number;
  status: string; // Assuming a status field exists, e.g., 'pending', 'approved'
  influencer_name?: string; // Assuming these fields will be available from the backend
  influencer_email?: string;
  brand_name?: string;
  is_active: boolean;
  created_at: string;
}

const AdminCodesPage = () => {
  const [pendingCodes, setPendingCodes] = useState<Code[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(true);
  const [errorPending, setErrorPending] = useState<string | null>(null);
  const [approvalInputs, setApprovalInputs] = useState<{ [key: string]: { discount: number; commission: number } }>({});

  const [allCodes, setAllCodes] = useState<Code[]>([]);
  const [loadingAllCodes, setLoadingAllCodes] = useState<boolean>(true);
  const [errorAllCodes, setErrorAllCodes] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [totalCodes, setTotalCodes] = useState<number>(0);

  useEffect(() => {
    const fetchPendingCodes = async () => {
      try {
        setLoadingPending(true);
        const response = await fetch('/api/codes?status=pending'); // Assuming backend supports status=pending
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Code[] = await response.json();
        setPendingCodes(data);
        // Initialize approval inputs with default values
        const initialInputs: { [key: string]: { discount: number; commission: number } } = {};
        data.forEach(code => {
          initialInputs[code.id] = { discount: 10, commission: 40 }; // Default values
        });
        setApprovalInputs(initialInputs);
      } catch (e: any) {
        setErrorPending(e.message || 'Failed to fetch pending codes.');
      } finally {
        setLoadingPending(false);
      }
    };

    fetchPendingCodes();
  }, []);

  useEffect(() => {
    const fetchAllCodes = async () => {
      try {
        setLoadingAllCodes(true);
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`/api/codes?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAllCodes(data.codes); // Assuming the API returns { codes: [], total: number }
        setTotalCodes(data.total);
      } catch (e: any) {
        setErrorAllCodes(e.message || 'Failed to fetch all codes.');
      } finally {
        setLoadingAllCodes(false);
      }
    };

    fetchAllCodes();
  }, [currentPage, itemsPerPage, startDate, endDate]);

  const handleInputChange = (codeId: string, field: 'discount' | 'commission', value: string) => {
    setApprovalInputs(prev => ({
      ...prev,
      [codeId]: {
        ...prev[codeId],
        [field]: Number(value),
      },
    }));
  };

  const handleApprove = async (codeId: string) => {
    const { discount, commission } = approvalInputs[codeId];
    if (isNaN(discount) || isNaN(commission) || discount < 1 || discount > 100 || commission < 1 || commission > 100) {
      alert('Please enter valid discount (1-100) and commission (1-100) percentages.');
      return;
    }

    try {
      const response = await fetch(`/api/codes/${codeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discount_percentage: discount,
          commission_pct: commission,
          status: 'approved', // Assuming backend updates status
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the approved code from the pending list and refresh all codes
      setPendingCodes(prev => prev.filter(code => code.id !== codeId));
      // Trigger re-fetch of all codes to update the list
      // This is a simple way to re-fetch, more sophisticated methods might involve updating state directly
      setCurrentPage(1); // Reset to first page to ensure fresh data
      alert('Code approved successfully!');
    } catch (e: any) {
      alert(`Failed to approve code: ${e.message}`);
    }
  };

  const handleCodeUpdate = async (code: Code) => {
    try {
      const response = await fetch(`/api/codes/${code.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discount_percentage: code.discount_percentage,
          commission_pct: code.commission_pct,
          is_active: code.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      alert('Code updated successfully!');
    } catch (e: any) {
      alert(`Failed to update code: ${e.message}`);
    }
  };

  const handleExport = () => {
    // Implement export logic here
    alert('Export functionality not yet implemented.');
  };

  const totalPages = Math.ceil(totalCodes / itemsPerPage);

  // Group codes by influencer
  const groupedCodes = allCodes.reduce((acc, code) => {
    const influencerKey = code.influencer_id; // Assuming influencer_id is unique for each influencer
    if (!acc[influencerKey]) {
      acc[influencerKey] = { influencer_name: code.influencer_name, influencer_email: code.influencer_email, brand_name: code.brand_name, codes: [] };
    }
    acc[influencerKey].codes.push(code);
    return acc;
  }, {} as { [key: string]: { influencer_name?: string; influencer_email?: string; brand_name?: string; codes: Code[] } });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Codes Management</h1>

      {/* Pending Codes Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Pending Codes</h2>
        {loadingPending && <p>Loading pending codes...</p>}
        {errorPending && <p className="text-red-500">{errorPending}</p>}
        {!loadingPending && !errorPending && pendingCodes.length === 0 && (
          <div className="bg-white p-4 rounded shadow">
            <p>No pending codes to display.</p>
          </div>
        )}
        {!loadingPending && !errorPending && pendingCodes.length > 0 && (
          <div className="bg-white p-4 rounded shadow">
            {pendingCodes.map(code => (
              <div key={code.id} className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                <p><strong>Code:</strong> {code.code}</p>
                <p><strong>Influencer:</strong> {code.influencer_name || 'N/A'} ({code.influencer_email || 'N/A'})</p>
                <p><strong>Brand:</strong> {code.brand_name || 'N/A'}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <label>
                    Discount (%):
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={approvalInputs[code.id]?.discount || ''}
                      onChange={(e) => handleInputChange(code.id, 'discount', e.target.value)}
                      className="ml-2 p-1 border rounded w-20"
                    />
                  </label>
                  <label>
                    Commission (%):
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={approvalInputs[code.id]?.commission || ''}
                      onChange={(e) => handleInputChange(code.id, 'commission', e.target.value)}
                      className="ml-2 p-1 border rounded w-20"
                    />
                  </label>
                  <button
                    onClick={() => handleApprove(code.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Codes List Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">All Codes</h2>
        <div className="bg-white p-4 rounded shadow">
          {/* Filters and Pagination Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-4">
              <label>
                Items per page:
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="ml-2 p-1 border rounded"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <label>
                Start Date:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ml-2 p-1 border rounded"
                />
              </label>
              <label>
                End Date:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ml-2 p-1 border rounded"
                />
              </label>
            </div>
            <button
              onClick={handleExport}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Export
            </button>
          </div>

          {loadingAllCodes && <p>Loading all codes...</p>}
          {errorAllCodes && <p className="text-red-500">{errorAllCodes}</p>}
          {!loadingAllCodes && !errorAllCodes && Object.keys(groupedCodes).length === 0 && (
            <p>No codes to display.</p>
          )}
          {!loadingAllCodes && !errorAllCodes && Object.keys(groupedCodes).length > 0 && (
            <div>
              {Object.entries(groupedCodes).map(([influencerId, data]) => (
                <div key={influencerId} className="mb-6 border p-4 rounded">
                  <h3 className="text-lg font-semibold mb-2">Influencer: {data.influencer_name} ({data.influencer_email})</h3>
                  <p className="mb-2">Brand: {data.brand_name}</p>
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b">Code</th>
                        <th className="py-2 px-4 border-b">Active</th>
                        <th className="py-2 px-4 border-b">Discount (%)</th>
                        <th className="py-2 px-4 border-b">Commission (%)</th>
                        <th className="py-2 px-4 border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.codes.map(code => (
                        <tr key={code.id}>
                          <td className="py-2 px-4 border-b">{code.code}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={code.is_active}
                              onChange={(e) => {
                                const updatedCode = { ...code, is_active: e.target.checked };
                                setAllCodes(prev => prev.map(c => c.id === code.id ? updatedCode : c));
                                handleCodeUpdate(updatedCode);
                              }}
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={code.discount_percentage}
                              onChange={(e) => {
                                const updatedCode = { ...code, discount_percentage: Number(e.target.value) };
                                setAllCodes(prev => prev.map(c => c.id === code.id ? updatedCode : c));
                              }}
                              onBlur={() => handleCodeUpdate(code)} // Update on blur
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={code.commission_pct}
                              onChange={(e) => {
                                const updatedCode = { ...code, commission_pct: Number(e.target.value) };
                                setAllCodes(prev => prev.map(c => c.id === code.id ? updatedCode : c));
                              }}
                              onBlur={() => handleCodeUpdate(code)} // Update on blur
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            {/* Add any other actions here if needed */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingAllCodes && !errorAllCodes && totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminCodesPage;