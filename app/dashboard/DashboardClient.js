'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import ListingModal from '../../components/ListingModal';
import { Check, X, Edit, Filter, ChevronLeft, ChevronRight, Car, MapPin, Calendar, DollarSign } from 'lucide-react';

export default function DashboardClient({ initialListings = [], error, requiresAuth = false }) {
  const safeInitialListings = Array.isArray(initialListings) ? initialListings : [];
  const [listings, setListings] = useState(safeInitialListings);
  const [filteredListings, setFilteredListings] = useState(safeInitialListings);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(requiresAuth);
  const [authError, setAuthError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(!requiresAuth);
  const itemsPerPage = 10;

  const router = useRouter();

  useEffect(() => {
    if (requiresAuth && !dataLoaded) {
      const checkAuth = async () => {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/login');
          return;
        }

        try {
          const response = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();
          
          if (!data.user || data.user.role !== 'admin') {
            router.push('/login');
            return;
          }
          const listingsResponse = await fetch('/api/listings', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (listingsResponse.ok) {
            const listingsData = await listingsResponse.json();
            let safeListings = [];
            if (Array.isArray(listingsData)) {
              safeListings = listingsData;
            } else if (listingsData && typeof listingsData === 'object') {
              if (Array.isArray(listingsData.listings)) {
                safeListings = listingsData.listings;
              } else if (Array.isArray(listingsData.data)) {
                safeListings = listingsData.data;
              } else {
                safeListings = [listingsData];
              }
            }
            
            setListings(safeListings);
            setFilteredListings(safeListings);
            setDataLoaded(true);
          } else {
            setListings([]);
            setFilteredListings([]);
            setDataLoaded(true);
          }
        } catch (error) {
          setAuthError('Authentication failed. Please login again.');
          toast.error('Authentication failed. Please login again.');
          router.push('/login');
        } finally {
          setLoading(false);
        }
      };

      checkAuth();
    } else if (!requiresAuth && !dataLoaded) {
      setDataLoaded(true);
    }
  }, [requiresAuth, dataLoaded, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (dataLoaded) {
      filterListings();
    }
  }, [listings, statusFilter, dataLoaded]);

  const filterListings = () => {
    const safeListings = Array.isArray(listings) ? listings : [];
    
    if (statusFilter === 'all') {
      setFilteredListings(safeListings);
    } else {
      setFilteredListings(safeListings.filter(listing => listing.status === statusFilter));
    }
    setCurrentPage(1);
  };

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/listings/${listingId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setListings(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map(listing => 
            listing.id === listingId ? { ...listing, status: newStatus } : listing
          );
        });
        toast.success(`Listing ${newStatus} successfully`, {
          icon: newStatus === 'approved' ? '✅' : '❌',
          duration: 4000,
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update listing status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Error updating listing status');
    }
  };

  const handleEdit = (listing) => {
    setSelectedListing(listing);
    setShowModal(true);
  };

  const handleSave = async (updatedListing) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/listings/${updatedListing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedListing)
      });

      if (response.ok) {
        const savedListing = await response.json();
        setListings(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map(listing => 
            listing.id === updatedListing.id ? savedListing : listing
          );
        });
        toast.success('Listing updated successfully', {
          icon: '📝',
          duration: 3000,
        });
        setShowModal(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Error updating listing');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const safeFilteredListings = Array.isArray(filteredListings) ? filteredListings : [];
  
  const paginatedListings = safeFilteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(safeFilteredListings.length / itemsPerPage);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="text-gray-600 text-lg font-medium">
                Loading dashboard...
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || authError) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-medium">
                Error loading dashboard
              </div>
              <p className="mt-2 text-gray-600">{error || authError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Toaster 
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            className: '',
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: 'green',
                secondary: 'black',
              },
            },
            error: {
              duration: 5000,
              theme: {
                primary: 'red',
                secondary: 'black',
              },
            },
          }}
        />
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-900">Car Rental Listings</h1>
              <p className="mt-2 text-sm text-gray-700">
                Manage and review all car rental listings submitted by users.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center space-x-4">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {safeFilteredListings.length} of {Array.isArray(listings) ? listings.length : 0} listings
            </div>
          </div>

          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedListings.length > 0 ? (
                        paginatedListings.map((listing) => (
                          <tr key={listing.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-16 w-16 flex-shrink-0">
                                  <img
                                    className="h-16 w-16 rounded-lg object-cover"
                                    src={listing.image_url}
                                    alt={listing.title || 'Car'}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {listing.title || 'Untitled'}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Car className="h-4 w-4 mr-1" />
                                    {listing.make} {listing.model}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="flex items-center mb-1">
                                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                  {listing.year}
                                </div>
                                <div className="flex items-center mb-1">
                                  <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                                  ${listing.price_per_day}/day
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                  {listing.location}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(listing.status)}`}>
                                {listing.status ? listing.status.charAt(0).toUpperCase() + listing.status.slice(1) : 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {listing.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(listing.id, 'approved')}
                                      className="text-green-600 hover:text-green-900 flex items-center"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(listing.id, 'rejected')}
                                      className="text-red-600 hover:text-red-900 flex items-center"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                {listing.status === 'approved' && (
                                  <button
                                    onClick={() => handleStatusChange(listing.id, 'rejected')}
                                    className="text-red-600 hover:text-red-900 flex items-center"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </button>
                                )}
                                {listing.status === 'rejected' && (
                                  <button
                                    onClick={() => handleStatusChange(listing.id, 'approved')}
                                    className="text-green-600 hover:text-green-900 flex items-center"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(listing)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                            {dataLoaded ? 'No listings found' : 'Loading listings...'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, safeFilteredListings.length)} of {safeFilteredListings.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
        <ListingModal
          listing={selectedListing}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      </Layout>
    </ProtectedRoute>
  );
}