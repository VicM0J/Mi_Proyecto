import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Eye, ArrowRight, CheckCircle, XCircle, Clock, MapPin, Activity, Trash2, Flag, Bell } from 'lucide-react';
import { RepositionForm } from './RepositionForm';
import { RepositionDetail } from './RepositionDetail';
import { RepositionTracker } from './RepositionTracker';
import Swal from 'sweetalert2';

interface Reposition {
  id: number;
  folio: string;
  type: 'repocision' | 'reproceso';
  solicitanteNombre: string;
  solicitanteArea: string;
  fechaSolicitud: string;
  modeloPrenda: string;
  currentArea: string;
  status: 'pendiente' | 'aprobado' | 'rechazado' | 'en_proceso' | 'completado';
  urgencia: 'urgente' | 'intermedio' | 'poco_urgente';
  createdAt: string;
}

const areas = [
  'patronaje', 'corte', 'bordado', 'ensamble', 'plancha', 'calidad', 'envios', 'operaciones', 'admin'
];

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  completado: 'bg-gray-100 text-gray-800',
  eliminado: 'bg-red-100 text-red-800'
};

const urgencyColors = {
  urgente: 'bg-red-100 text-red-800',
  intermedio: 'bg-yellow-100 text-yellow-800',
  poco_urgente: 'bg-green-100 text-green-800'
};

export function RepositionList({ userArea }: { userArea: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedReposition, setSelectedReposition] = useState<number | null>(null);
  const [trackedReposition, setTrackedReposition] = useState<number | null>(null);
  const [filterArea, setFilterArea] = useState<string>(userArea === 'admin' ? 'all' : userArea);
  const [showHistory, setShowHistory] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const queryClient = useQueryClient();

  const { data: repositions = [], isLoading } = useQuery({
    queryKey: ['repositions', filterArea, showHistory, includeDeleted],
    queryFn: async () => {
      let url = showHistory && userArea === 'admin' 
        ? `/api/repositions/all?includeDeleted=${includeDeleted}`
        : (filterArea && filterArea !== 'all')
          ? `/api/repositions?area=${filterArea}`
          : '/api/repositions';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch repositions');
      return response.json();
    }
  });

  const { data: pendingTransfers = [] } = useQuery({
    queryKey: ['pending-reposition-transfers'],
    queryFn: async () => {
      const response = await fetch('/api/repositions/transfers/pending');
      if (!response.ok) return [];
      return response.json();
    }
  });

  const transferMutation = useMutation({
    mutationFn: async ({ repositionId, toArea, notes }: { repositionId: number, toArea: string, notes?: string }) => {
      const response = await fetch(`/api/repositions/${repositionId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toArea, notes }),
      });
      if (!response.ok) throw new Error('Failed to transfer reposition');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositions'] });
      Swal.fire({
        title: '¡Éxito!',
        text: 'Solicitud transferida correctamente',
        icon: 'success',
        confirmButtonColor: '#8B5CF6'
      });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ repositionId, action, notes }: { repositionId: number, action: string, notes?: string }) => {
      const response = await fetch(`/api/repositions/${repositionId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (!response.ok) throw new Error('Failed to process approval');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositions'] });
      Swal.fire({
        title: '¡Éxito!',
        text: 'Solicitud procesada correctamente',
        icon: 'success',
        confirmButtonColor: '#8B5CF6'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ repositionId, reason }: { repositionId: number, reason: string }) => {
      console.log('Deleting reposition:', repositionId, 'with reason:', reason);
      const response = await fetch(`/api/repositions/${repositionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();
      console.log('Delete response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete reposition');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositions'] });
      Swal.fire({
        title: '¡Eliminada!',
        text: 'Reposición eliminada correctamente',
        icon: 'success',
        confirmButtonColor: '#8B5CF6'
      });
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      Swal.fire({
        title: 'Error',
        text: error.message || 'No se pudo eliminar la reposición',
        icon: 'error',
        confirmButtonColor: '#8B5CF6'
      });
    }
  });

  const completeMutation = useMutation({
    mutationFn: async ({ repositionId, notes }: { repositionId: number, notes?: string }) => {
      const response = await fetch(`/api/repositions/${repositionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to complete reposition');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositions'] });
      Swal.fire({
        title: '¡Éxito!',
        text: 'Proceso completado correctamente',
        icon: 'success',
        confirmButtonColor: '#8B5CF6'
      });
    }
  });

  const processTransferMutation = useMutation({
    mutationFn: async ({ transferId, action }: { transferId: number, action: 'accepted' | 'rejected' }) => {
      const response = await fetch(`/api/repositions/transfers/${transferId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error('Failed to process transfer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reposition-transfers'] });
      Swal.fire({
        title: '¡Éxito!',
        text: 'Transferencia procesada correctamente',
        icon: 'success',
        confirmButtonColor: '#8B5CF6'
      });
    }
  });

  const handleTransfer = async (repositionId: number) => {
    const { value: toArea } = await Swal.fire({
      title: 'Transferir a Área',
      input: 'select',
      inputOptions: areas.reduce((acc, area) => {
        acc[area] = area.charAt(0).toUpperCase() + area.slice(1);
        return acc;
      }, {} as Record<string, string>),
      inputPlaceholder: 'Selecciona un área',
      showCancelButton: true,
      confirmButtonColor: '#8B5CF6',
      inputValidator: (value) => {
        if (!value) return 'Debes seleccionar un área';
      }
    });

    if (toArea) {
      const { value: notes } = await Swal.fire({
        title: 'Notas de transferencia',
        input: 'textarea',
        inputPlaceholder: 'Notas adicionales (opcional)',
        showCancelButton: true,
        confirmButtonColor: '#8B5CF6'
      });

      transferMutation.mutate({ repositionId, toArea, notes });
    }
  };

  const handleApproval = async (repositionId: number, action: 'aprobado' | 'rechazado') => {
    const { value: notes } = await Swal.fire({
      title: `${action === 'aprobado' ? 'Aprobar' : 'Rechazar'} Solicitud`,
      input: 'textarea',
      inputPlaceholder: 'Comentarios (opcional)',
      showCancelButton: true,
      confirmButtonColor: '#8B5CF6'
    });

    if (notes !== undefined) {
      approveMutation.mutate({ repositionId, action, notes });
    }
  };

  const handleDelete = async (repositionId: number) => {
    const { value: reason } = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará la reposición permanentemente',
      input: 'textarea',
      inputPlaceholder: 'Describe el motivo por el cual esta reposición ya no es necesaria *',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Debes proporcionar un motivo para la eliminación';
        }
        if (value.trim().length < 10) {
          return 'El motivo debe tener al menos 10 caracteres';
        }
      }
    });

    if (reason !== undefined && reason.trim().length > 0) {
      deleteMutation.mutate({ repositionId, reason: reason.trim() });
    }
  };

  const handleComplete = async (repositionId: number) => {
    const { value: notes } = await Swal.fire({
      title: 'Finalizar Proceso',
      input: 'textarea',
      inputPlaceholder: 'Notas de finalización (opcional)',
      showCancelButton: true,
      confirmButtonColor: '#8B5CF6',
      confirmButtonText: userArea === 'admin' || userArea === 'envios' ? 'Finalizar' : 'Solicitar Finalización'
    });

    if (notes !== undefined) {
      completeMutation.mutate({ repositionId, notes });
    }
  };

  const handleProcessTransfer = async (transferId: number, action: 'accepted' | 'rejected') => {
    const result = await Swal.fire({
      title: `¿${action === 'accepted' ? 'Aceptar' : 'Rechazar'} transferencia?`,
      text: `Esta acción ${action === 'accepted' ? 'moverá la reposición a tu área' : 'rechazará la transferencia'}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: action === 'accepted' ? '#10B981' : '#EF4444',
      confirmButtonText: action === 'accepted' ? 'Aceptar' : 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      processTransferMutation.mutate({ transferId, action });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando solicitudes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-800">Solicitudes de Reposición</h1>
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        {userArea === 'admin' && (
          <>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>
                    {area.charAt(0).toUpperCase() + area.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-history"
                checked={showHistory}
                onCheckedChange={setShowHistory}
              />
              <Label htmlFor="show-history">Ver historial completo</Label>
            </div>

            {showHistory && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-deleted"
                  checked={includeDeleted}
                  onCheckedChange={setIncludeDeleted}
                />
                <Label htmlFor="include-deleted">Incluir eliminadas</Label>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transferencias Pendientes */}
      {pendingTransfers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="w-5 h-5" />
              Transferencias Pendientes ({pendingTransfers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTransfers.map((transfer: any) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-semibold text-gray-800">
                      Reposición desde {transfer.fromArea}
                    </p>
                    <p className="text-sm text-gray-600">
                      {transfer.notes && `Notas: ${transfer.notes}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transfer.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleProcessTransfer(transfer.id, 'accepted')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleProcessTransfer(transfer.id, 'rejected')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de solicitudes */}
      <div className="grid gap-4">
        {repositions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No hay solicitudes de reposición
            </CardContent>
          </Card>
        ) : (
          repositions.map((reposition: Reposition) => (
            <Card key={reposition.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-purple-800">
                      {reposition.folio}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {reposition.solicitanteNombre} • {reposition.modeloPrenda}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={statusColors[reposition.status]}>
                      {reposition.status}
                    </Badge>
                    <Badge className={urgencyColors[reposition.urgencia]}>
                      {reposition.urgencia}
                    </Badge>
                    <Badge variant="outline">
                      {reposition.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Área actual: {reposition.currentArea}</span>
                    <span>•</span>
                    <span>{new Date(reposition.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReposition(reposition.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackedReposition(reposition.id)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Seguimiento
                    </Button>

                    {reposition.currentArea === userArea && (
                      <>
                        {reposition.status === 'aprobado' && reposition.status !== 'eliminado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTransfer(reposition.id)}
                          >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Transferir
                          </Button>
                        )}
                      </>
                    )}

                    {(userArea === 'operaciones' || userArea === 'admin' || userArea === 'envios') && 
                     reposition.status === 'pendiente' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleApproval(reposition.id, 'aprobado')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleApproval(reposition.id, 'rechazado')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}

                    {reposition.status !== 'completado' && reposition.status !== 'eliminado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 hover:bg-purple-50"
                        onClick={() => handleComplete(reposition.id)}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        {userArea === 'admin' || userArea === 'envios' ? 'Finalizar' : 'Solicitar Finalización'}
                      </Button>
                    )}

                    {(userArea === 'admin' || userArea === 'envios') && 
                     reposition.status !== 'eliminado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(reposition.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showForm && <RepositionForm onClose={() => setShowForm(false)} />}
      {selectedReposition && (
        <RepositionDetail
          repositionId={selectedReposition}
          onClose={() => setSelectedReposition(null)}
        />
      )}
      {trackedReposition && (
        <RepositionTracker
          repositionId={trackedReposition}
          onClose={() => setTrackedReposition(null)}
        />
      )}
    </div>
  );
}