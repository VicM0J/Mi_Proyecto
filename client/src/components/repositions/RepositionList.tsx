import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { RepositionForm } from './RepositionForm';
import { RepositionDetail } from './RepositionDetail';
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
  'patronaje', 'corte', 'bordado', 'ensamble', 'plancha', 'calidad', 'operaciones', 'admin'
];

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  completado: 'bg-gray-100 text-gray-800'
};

const urgencyColors = {
  urgente: 'bg-red-100 text-red-800',
  intermedio: 'bg-yellow-100 text-yellow-800',
  poco_urgente: 'bg-green-100 text-green-800'
};

export function RepositionList({ userArea }: { userArea: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedReposition, setSelectedReposition] = useState<number | null>(null);
  const [filterArea, setFilterArea] = useState<string>(userArea === 'admin' ? 'all' : userArea);
  const queryClient = useQueryClient();

  const { data: repositions = [], isLoading } = useQuery({
    queryKey: ['repositions', filterArea],
    queryFn: async () => {
      const url = (filterArea && filterArea !== 'all')
  ? `/api/repositions?area=${filterArea}`
  : '/api/repositions';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch repositions');
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
      {userArea === 'admin' && (
        <div className="flex gap-4">
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
        </div>
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
                    
                    {reposition.currentArea === userArea && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransfer(reposition.id)}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Transferir
                      </Button>
                    )}

                    {(userArea === 'operaciones' || userArea === 'admin') && 
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
    </div>
  );
}