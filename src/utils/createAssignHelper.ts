import { Expression, TransformationContext} from "typescript";

export default function createAssignHelper(
    context: TransformationContext,
    attributesSegments: Expression[]
) {
    const {factory} = context;

    return factory.createCallExpression(
        factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "assign"),
        undefined,
        attributesSegments
    );
}
