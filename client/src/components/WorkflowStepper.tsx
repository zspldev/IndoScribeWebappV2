import { CheckIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

type StepStatus = 'pending' | 'current' | 'completed';

type Step = {
  number: number;
  title: string;
  status: StepStatus;
};

type WorkflowStepperProps = {
  steps: Step[];
};

export default function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <div className="w-full mb-6" data-testid="workflow-stepper">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                  step.status === 'completed' && "bg-primary border-primary text-primary-foreground",
                  step.status === 'current' && "border-primary text-primary bg-primary/10",
                  step.status === 'pending' && "border-muted-foreground/30 text-muted-foreground"
                )}
                data-testid={`step-indicator-${step.number}`}
              >
                {step.status === 'completed' ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px]",
                  step.status === 'completed' && "text-primary",
                  step.status === 'current' && "text-primary",
                  step.status === 'pending' && "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-20px]",
                  step.status === 'completed' ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
