
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, User, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';

interface RepositionTrackerProps {
  repositionId: number;
  onClose: () => void;
}

interface TrackingStep {
  id: number;
  area: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
  user?: string;
  notes?: string;
}

interface TrackingData {
  reposition: {
    folio: string;
    status: string;
    currentArea: string;
    progress: number;
  };
  steps: TrackingStep[];
  history: Array<{
    id: number;
    action: string;
    description: string;
    timestamp: string;
    userName: string;
    fromArea?: string;
    toArea?: string;
  }>;
}

export function RepositionTracker({ repositionId, onClose }: RepositionTrackerProps) {
  const { data: trackingData, isLoading } = useQuery<TrackingData>({
    queryKey: [`/api/repositions/${repositionId}/tracking`],
    queryFn: async () => {
      const response = await fetch(`/api/repositions/${repositionId}/tracking`);
      if (!response.ok) throw new Error('Failed to fetch tracking data');
      return response.json();
    }
  });

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'current':
        return <MapPin className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      patronaje: 'Patronaje',
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha',
      calidad: 'Calidad',
      operaciones: 'Operaciones',
      admin: 'Administración'
    };
    return names[area] || area;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">Cargando seguimiento...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!trackingData) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">No se pudo cargar el seguimiento</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="text-blue-600" />
            Seguimiento de Reposición - {trackingData.reposition.folio}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progreso</span>
                  <Badge variant="outline">{trackingData.reposition.progress}%</Badge>
                </div>
                <Progress value={trackingData.reposition.progress} className="h-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Área actual:</span>
                  <Badge>{getAreaDisplayName(trackingData.reposition.currentArea)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <Badge variant={trackingData.reposition.status === 'completado' ? 'default' : 'secondary'}>
                    {trackingData.reposition.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Flujo de Proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trackingData.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {getStepIcon(step.status)}
                      {index < trackingData.steps.length - 1 && (
                        <div className={`w-px h-12 mt-2 ${
                          step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`p-4 rounded-lg border ${
                        step.status === 'current' 
                          ? 'bg-blue-50 border-blue-200' 
                          : step.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{getAreaDisplayName(step.area)}</h4>
                            {step.timestamp && (
                              <p className="text-sm text-gray-600 mt-1">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {formatDate(step.timestamp)}
                              </p>
                            )}
                            {step.user && (
                              <p className="text-sm text-gray-600">
                                <User className="w-4 h-4 inline mr-1" />
                                {step.user}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={
                              step.status === 'completed' ? 'default' : 
                              step.status === 'current' ? 'secondary' : 'outline'
                            }
                          >
                            {step.status === 'completed' ? 'Completado' : 
                             step.status === 'current' ? 'En Proceso' : 'Pendiente'}
                          </Badge>
                        </div>
                        {step.notes && (
                          <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border">
                            {step.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trackingData.history.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{event.action}</p>
                          <p className="text-sm text-gray-600">{event.description}</p>
                          {event.fromArea && event.toArea && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getAreaDisplayName(event.fromArea)}
                              </Badge>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <Badge variant="outline" className="text-xs">
                                {getAreaDisplayName(event.toArea)}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(event.timestamp)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Por: {event.userName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
