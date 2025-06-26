import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Clock, User, Package, FileText } from 'lucide-react';

interface RepositionDetail {
  id: number;
  folio: string;
  type: string;
  solicitanteNombre: string;
  solicitanteArea: string;
  fechaSolicitud: string;
  noSolicitud: string;
  noHoja?: string;
  causanteDano: string;
  descripcionSuceso: string;
  modeloPrenda: string;
  tela: string;
  color: string;
  tipoPieza: string;
  urgencia: string;
  observaciones?: string;
  currentArea: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
}

interface RepositionPiece {
  id: number;
  talla: string;
  cantidad: number;
  folioOriginal?: string;
}

interface RepositionHistory {
  id: number;
  action: string;
  description: string;
  fromArea?: string;
  toArea?: string;
  createdAt: string;
}

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

export function RepositionDetail({ 
  repositionId, 
  onClose 
}: { 
  repositionId: number; 
  onClose: () => void; 
}) {
  const { data: reposition, isLoading } = useQuery({
    queryKey: ['reposition', repositionId],
    queryFn: async () => {
      const response = await fetch(`/api/repositions/${repositionId}`);
      if (!response.ok) throw new Error('Failed to fetch reposition');
      return response.json();
    }
  });

  const { data: pieces = [] } = useQuery({
    queryKey: ['reposition-pieces', repositionId],
    queryFn: async () => {
      const response = await fetch(`/api/repositions/${repositionId}/pieces`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: history = [] } = useQuery({
    queryKey: ['reposition-history', repositionId],
    queryFn: async () => {
      const response = await fetch(`/api/repositions/${repositionId}/history`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Cargando detalles...</div>
        </div>
      </div>
    );
  }

  if (!reposition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-purple-800">
                Detalles de Solicitud
              </h2>
              <p className="text-lg font-semibold text-gray-700 mt-1">
                {reposition.folio}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Badge className={statusColors[reposition.status as keyof typeof statusColors]}>
                  {reposition.status}
                </Badge>
                <Badge className={urgencyColors[reposition.urgencia as keyof typeof urgencyColors]}>
                  {reposition.urgencia}
                </Badge>
                <Badge variant="outline">
                  {reposition.type}
                </Badge>
              </div>
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Información del Solicitante */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Información del Solicitante
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-semibold text-gray-700">Nombre</p>
                <p>{reposition.solicitanteNombre}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Área</p>
                <p className="capitalize">{reposition.solicitanteArea}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha de Solicitud</p>
                <p>{new Date(reposition.fechaSolicitud).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Número de Solicitud */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Número de Solicitud
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-gray-700">No. Solicitud de Pedido</p>
                <p>{reposition.noSolicitud}</p>
              </div>
              {reposition.noHoja && (
                <div>
                  <p className="font-semibold text-gray-700">No. de Hoja</p>
                  <p>{reposition.noHoja}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descripción del Daño */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción del Daño</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-gray-700">Causante del Daño</p>
                <p>{reposition.causanteDano}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Descripción del Suceso</p>
                <p className="whitespace-pre-wrap">{reposition.descripcionSuceso}</p>
              </div>
            </CardContent>
          </Card>

          {/* Información del Producto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-gray-700">Modelo de la Prenda</p>
                <p>{reposition.modeloPrenda}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tela</p>
                <p>{reposition.tela}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Color</p>
                <p>{reposition.color}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo de Pieza</p>
                <p>{reposition.tipoPieza}</p>
              </div>
            </CardContent>
          </Card>

          {/* Piezas Solicitadas */}
          {pieces.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Piezas Solicitadas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Talla</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>No° Folio Original</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pieces.map((piece: RepositionPiece) => (
                      <TableRow key={piece.id}>
                        <TableCell>{piece.talla}</TableCell>
                        <TableCell>{piece.cantidad}</TableCell>
                        <TableCell>{piece.folioOriginal || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          {reposition.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{reposition.observaciones}</p>
              </CardContent>
            </Card>
          )}

          {/* Historial */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Historial de Movimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((entry: RepositionHistory) => (
                    <div key={entry.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        {entry.fromArea && entry.toArea && (
                          <p className="text-sm text-purple-600">
                            {entry.fromArea} → {entry.toArea}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Estado Actual</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-gray-700">Área Actual</p>
                <p className="capitalize">{reposition.currentArea}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha de Creación</p>
                <p>{new Date(reposition.createdAt).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric', 
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Mexico_City'
                })}</p>
              </div>
              {reposition.approvedAt && (
                <div>
                  <p className="font-semibold text-gray-700">Fecha de Aprobación</p>
                  <p>{new Date(reposition.approvedAt).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'America/Mexico_City'
                  })}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}